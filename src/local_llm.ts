import { MarkdownRenderer, MarkdownView, Notice } from "obsidian";


export class LocalLLM {
	maxTokens: number;

	constructor(maxTokens: number) {
		this.maxTokens = maxTokens;
	}

	api_call = async (
        prompt : string,
        htmlEl?: any, // fix this type issue.
		view?: MarkdownView,
		num_tokens ?: number
	) => {
		if (!num_tokens) num_tokens = this.maxTokens
		const streamMode = htmlEl !== undefined;

		try {			
			const response = await fetch(
				"http://localhost:8000/v1/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						max_tokens: num_tokens,
                        prompt : prompt,
						stream: streamMode,
					}),
				}
			);
			if (streamMode) {
				const reader = response.body?.getReader();
				const textDecoder = new TextDecoder("utf-8");

                // DEBUG : see diffrence between open ai and local llm.

				if (!reader) {
					throw new Error("Error: fail to read data from response");
				}

				let responseText = "";
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = textDecoder.decode(value);

					let currentText = "";
					for (const line of chunk.split("\n")) {
						const trimmedLine = line.trim();

						if (!trimmedLine || trimmedLine === "data: [DONE]" || !trimmedLine.startsWith("data: ")) {
							continue;
						}


						const response = JSON.parse(
							trimmedLine.replace("data: ", "")
						);
						const content = response.choices[0].text;
						if (!content) continue;

						currentText = currentText.concat(content);
					}
					responseText += currentText;
					// Reset inner HTML before rendering Markdown
					htmlEl.innerHTML = "";
					if (streamMode) {
						if (view) {
							await MarkdownRenderer.renderMarkdown(
								responseText,
								htmlEl,
								"",
								view
							);
						} else {
							htmlEl.innerHTML += currentText;
						}
					}
				}
				return htmlEl.innerHTML;
			} else {
				const data = await response.json();
                // DEBUG : see diffrence between open ai and local llm.
				return data.choices[0].text;
			}
		} catch (err) {
			new Notice(" ## Local LLM Error: " + err);
		}
	};

}