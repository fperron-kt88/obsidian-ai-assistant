import {
	App,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	requestUrl,
	Setting,
} from "obsidian";
import { LocalLLM } from "./local_llm";

export class PromptModal extends Modal {
	param_dict: { [key: string]: string };
	onSubmit: (input_dict: object) => void;
	is_img_modal: boolean;

	constructor(
		app: App,
		onSubmit: (x: object) => void,
		is_img_modal: boolean
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.is_img_modal = is_img_modal;
		this.param_dict = { img_size: "256x256", num_img: "1" };
	}

	onOpen() {
		const { contentEl } = this;
		if (this.is_img_modal) {
			this.titleEl.setText("What can I generate for you?");
		} else {
			this.titleEl.setText("What can I do for you?");
		}

		const prompt_area = new Setting(contentEl).addText((text) =>
			text.onChange((value) => {
				this.param_dict["prompt_text"] = value.trim();
			})
		);

		prompt_area.addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					if (this.param_dict["prompt_text"]) {
						this.close();
						this.onSubmit(this.param_dict);
					}
				})
		);

		const input_prompt = this.modalEl.getElementsByTagName("input")[0];
		input_prompt.addEventListener("keypress", (evt) => {
			if (evt.key === "Enter" && this.param_dict["prompt_text"]) {
				new Notice(this.param_dict["prompt_text"]);
				this.close();
				this.onSubmit(this.param_dict);
			}
		});

		if (this.is_img_modal) {
			const prompt_container = this.contentEl.createEl("div", {
				cls: "prompt-modal-container",
			});
			this.contentEl.append(prompt_container);

			const prompt_left_container = prompt_container.createEl("div", {
				cls: "prompt-left-container",
			});

			const desc1 = prompt_left_container.createEl("p", {
				cls: "description",
			});
			desc1.innerText = "Resolution";

			const desc2 = prompt_left_container.createEl("p", {
				cls: "description",
			});
			desc2.innerText = "Num images";

			const prompt_right_container = prompt_container.createEl("div", {
				cls: "prompt-right-container",
			});

			const resolution_dropdown =
				prompt_right_container.createEl("select");
			const options = ["256x256", "512x512", "1024x1024"];
			options.forEach((option) => {
				const optionEl = resolution_dropdown.createEl("option", {
					text: option,
				});
				optionEl.value = option;
				if (option === this.param_dict["img_size"]) {
					optionEl.selected = true;
				}
			});
			resolution_dropdown.addEventListener("change", (event) => {
				const selectElement = event.target as HTMLSelectElement;
				this.param_dict["img_size"] = selectElement.value;
			});

			const num_img_dropdown = prompt_right_container.createEl("select");
			const num_choices = [...Array(10).keys()].map((x) =>
				(x + 1).toString()
			);

			num_choices.forEach((option) => {
				const optionEl = num_img_dropdown.createEl("option", {
					text: option,
				});
				optionEl.value = option;
				if (option === this.param_dict["num_img"]) {
					optionEl.selected = true;
				}
			});
			num_img_dropdown.addEventListener("change", (event) => {
				const selectElement = event.target as HTMLSelectElement;
				this.param_dict["num_img"] = selectElement.value;
			});
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class ChatModal extends Modal {
	prompt_text: string;
	num_tokens : number;
	prompt_table: { [key: string]: string }[] = [];
	local_llm: LocalLLM;
	is_generating_answer: boolean;

	constructor(app: App, local_llm: any) {
		super(app);
		this.local_llm = local_llm;
		this.is_generating_answer = false;
	}

	clearModalContent() {
		this.contentEl.innerHTML = "";
		this.prompt_text = "";
		this.num_tokens = -1;
	}

	send_action = async () => {
		if (this.prompt_text && !this.is_generating_answer) {
			this.is_generating_answer = true;
			const input_prompt = this.modalEl.getElementsByTagName("input")[0];
			input_prompt.disabled = true;

			const chatPrompt = `USER: ${this.prompt_text}.\n\nASSISTANT:\n`;
			const num_tokens = this.num_tokens > 0 ? this.num_tokens : undefined;

			const prompt = {
				role: "user",
				content: this.prompt_text,
			};

			this.prompt_table.push(prompt, {
				role: "assistant",
			});

			this.clearModalContent();
			await this.displayModalContent();

			this.prompt_table.pop();
			const answers =
				this.modalEl.getElementsByClassName("chat-div assistant");
			const view = this.app.workspace.getActiveViewOfType(
				MarkdownView
			) as MarkdownView;
			const answer = await this.local_llm.api_call(
				chatPrompt,
				answers[answers.length - 1],
				view,
				num_tokens
			);
			if (answer) {
				this.prompt_table.push({
					role: "assistant",
					content: answer,
				});
			}

			this.is_generating_answer = false;
			this.clearModalContent();
			await this.displayModalContent();
			
		}
	};

	async displayModalContent() {
		const { contentEl } = this;
		const container = this.contentEl.createEl("div", {
			cls: "chat-modal-container",
		});
		const view = this.app.workspace.getActiveViewOfType(
			MarkdownView
		) as MarkdownView;

		for (const x of this.prompt_table) {
			const div = container.createEl("div", {
				cls: `chat-div ${x["role"]}`,
			});
			if (x["role"] === "assistant") {
				await MarkdownRenderer.renderMarkdown(
					x["content"],
					div,
					"",
					view
				);
			} else {
				div.createEl("p", {
					text: x["content"],
				});
			}
			div.addEventListener("click", async () => {
				await navigator.clipboard.writeText(x["content"]);
				new Notice(x["content"] + " Copied to clipboard!");
			});
		}

		const prompt_field = new Setting(contentEl)
			.setName("Type here:")
			.addText((text) => {
				text.setPlaceholder("Your prompt here").onChange((value) => {
					this.prompt_text = value.trim();
				});
			});

		const tokens_field = new Setting(contentEl)
			.setName("In many tokens do you want your response in? " )
			.addText((text) => {
					text.setPlaceholder("Your tokens here").onChange((value) => {
						try {
							this.num_tokens = parseInt(value.trim());
						} catch (error) {
							new Notice("Input error: " + error);
						}
					});
			});

		const input_prompt = this.modalEl.getElementsByTagName("input")[0];
		input_prompt.focus();
		input_prompt.select();
		input_prompt.disabled = this.is_generating_answer;

		const token_prompt = this.modalEl.getElementsByTagName("input")[1];
		token_prompt.disabled = this.is_generating_answer;


		input_prompt.addEventListener("keypress", (evt) => {
			if (evt.key === "Enter") {
				this.send_action();
			}
		});

		tokens_field.addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					if(!this.is_generating_answer){
						this.send_action()
					}else{
						new Notice("Please wait for the current response to be generated.")
					}
				})
		);

		const submit_button = this.modalEl.getElementsByTagName("button")[0];
		submit_button.disabled = this.is_generating_answer;

		const clear_button = new Setting(contentEl).addButton((btn) =>
			btn.setButtonText("Clear").onClick(() => {
				this.prompt_table = [];
				this.clearModalContent();
				this.displayModalContent();
			})
		);

		clear_button.addButton((btn) =>
			btn.setButtonText("Copy conversation").onClick(async () => {
				const conversation = this.prompt_table
					.map((x) => x["content"])
					.join("\n\n");
				await navigator.clipboard.writeText(conversation);
				new Notice("Conversation copied to clipboard");
			})
		);

		const clr_button = this.modalEl.getElementsByTagName("button")[1];
		clr_button.disabled = this.is_generating_answer;

		const copy_conv_button = this.modalEl.getElementsByTagName("button")[2];
		copy_conv_button.disabled = this.is_generating_answer;
	}

	onOpen() {
		this.titleEl.setText("What can I do for you?");
		this.displayModalContent();
	}

	onClose() {
		this.contentEl.empty();
	}
}
