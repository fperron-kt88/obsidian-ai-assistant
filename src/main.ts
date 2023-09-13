import {
	App,
	Editor,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { ChatModal, NotificationModal, PromptModal } from "./modal";
import { LocalLLM } from "./local_llm";
interface AiAssistantSettings {
	mySetting: string;
	modelName: string;
	maxTokens: number;
	replaceSelection: boolean;
	imgFolder: string;
	language: string;
}

const DEFAULT_SETTINGS: AiAssistantSettings = {
	mySetting: "default",
	modelName: "gpt-3.5-turbo",
	maxTokens: 500,
	replaceSelection: true,
	imgFolder: "AiAssistant/Assets",
	language: "",
};

export default class AiAssistantPlugin extends Plugin {
	settings: AiAssistantSettings;
	local_llm: LocalLLM;

	build_api() {
		this.local_llm = new LocalLLM(this.settings.maxTokens);
	}

	async onload() {
		await this.loadSettings();
		this.build_api();

		this.addCommand({
			id: "chat-mode",
			name: "Open Assistant Chat",
			callback: () => {
				new ChatModal(this.app, this.local_llm).open();
			},
		});

		this.addCommand({
			id: "prompt-mode",
			name: "Open Assistant Prompt",
			editorCallback: async (editor: Editor) => {
				const selected_text = editor.getSelection().toString().trim();
				new PromptModal(
					this.app,
					async (x: { [key: string]: string | number | undefined}) => {
						let chatPrompt = `USER: ${x['prompt_text']}.\n\nASSISTANT:\n`;
						if(chatPrompt.contains("#doc")){
							chatPrompt = chatPrompt.replace("#doc", selected_text);
						}
		

						const num_tokens = x['num_tokens'] && typeof x['num_tokens'] === 'number' && x['num_tokens'] > 0 ? x['num_tokens'] : undefined;
						// TODO : Show a modal with a loading bar while we wait for the api call.
						const notif_modal = new NotificationModal(this.app, "Generating answer...");
						notif_modal.open();
						let answer = await this.local_llm.api_call(chatPrompt, undefined, undefined, num_tokens);
						answer = answer!;
						notif_modal.close();

						const generated_text = "\n<======== \n## Generated by AI\n" +  answer.trim() + "\n========>\n";
						if (!this.settings.replaceSelection) {
							answer = selected_text + "\n" + generated_text;
						}
						if (answer) {
							editor.replaceSelection(generated_text);
						}
					},
				).open();
			},
		});

		this.addSettingTab(new AiAssistantSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AiAssistantSettingTab extends PluginSettingTab {
	plugin: AiAssistantPlugin;

	constructor(app: App, plugin: AiAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for my AI assistant." });

		containerEl.createEl("h3", { text: "Text Assistant" });

		new Setting(containerEl)
			.setName("Max Tokens")
			.setDesc("Select max number of generated tokens")
			.addText((text) =>
				text
					.setPlaceholder("Max tokens")
					.setValue(this.plugin.settings.maxTokens.toString())
					.onChange(async (value) => {
						const int_value = parseInt(value);
						if (!int_value || int_value <= 0) {
							new Notice("Error while parsing maxTokens ");
						} else {
							this.plugin.settings.maxTokens = int_value;
							await this.plugin.saveSettings();
							this.plugin.build_api();
						}
					})
			);

		new Setting(containerEl)
			.setName("Prompt behavior")
			.setDesc("Replace selection")
			.addToggle((toogle) => {
				toogle
					.setValue(this.plugin.settings.replaceSelection)
					.onChange(async (value) => {
						this.plugin.settings.replaceSelection = value;
						await this.plugin.saveSettings();
						this.plugin.build_api();
					});
			});
	}
}
