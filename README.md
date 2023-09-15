
# Local AI Obsidian AI Assistant
This project is a fork of [Obsidian AI Assistant](https://github.com/qgrail/obsidian-ai-assistant).

Unlike Obsidian AI Assistant, this simple plugin enables interactions with local AI Models. For that and many other reasons, this plugin only supports text generation for now.

## Set up.
Requisites:
    <ul>
        <li>node</li>
        <li>npm</li>
        <li>python</li>
    </ul> 

There are 3 simple (😜) steps to setting up this plugin.



1. Install and Run your model
    - Download any model in `GGUF` format since the backend [llama-cpp-python](https://github.com/abetlen/llama-cpp-python) uses `GGUF`. 
    - Place this model in a folder of your choice. e.g `/home/user/.gguf-models`
    - Set a model environment variable `export MODEL=/home/user/.gguf-models/llama2-13b-Q4_K_M.gguf`
    - run the server that will serve requests and provide model answers `python3 -m llama_cpp.server`
    - leave it running while you are using it.
    - To test that this is working, you can use `curl`
    ```bash
    curl -X 'POST' \
    'http://localhost:8000/v1/completions' \
    -H 'accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{
    "prompt": "USER: What is Obsidian.md?\n\nASSISTANT:\n",
    "stream": false, "max_tokens": 256,
    "stop": []
    }'
    ```
    - the response should be in this or a similar format
    ```bash
    {"id":"cmpl-5641e188-47f4-43bf-a6fa-4bd2fb7313b6","object":"text_completion","created":1694562948,"model":"/Users/ngacho/Desktop/everything-code/local-llm/models/Llama2-13B-MegaCode2-OASST-GGUF/llama2-13b-megacode2-oasst.Q4_K_M.gguf","choices":[{"text":"My name is Open Assistant and I am an","index":0,"logprobs":null,"finish_reason":"length"}],"usage":{"prompt_tokens":16,"completion_tokens":10,"total_tokens":26}}
    ```

2. Install the plugin in the Obsidian Vault folder
    - Navigate to your obsidian vaults plugin folder (It'll look like something like this `HOME/MyObsidian/.obsidian/plugins`)
        - You can also find this folder from Settings (shortcut : cmd + ,)  
        - open the terminal at this folder
        - git clone [repo](https://github.com/ngacho/obsidian-ai-assistant)
        - run `npm i && npm audit fix`
        - run `npm run build`
        - update the url of the post request to the local server where your model is listening from. so for instance mine is running on `http://localhost:8000/v1/completions`

3. Open Obsidian > Settings > Community Plugins > Toggle LLM Assistant

### 🤖 Text Assistant

You have two commands to interact with the text assistant:
1. Chat mode,
2. Prompt mode.

|        Chat Mode         |       Prompt Mode         | 
|:------------------------:|:-------------------------:|
|  ![](gifs/chat_mode.gif) | ![](gifs/prompt_mode.gif) |

#### Chat mode
Chat with the AI assistant from your Vault to generate content for your notes.
From the chat, you can clic on any interaction to copy it directly to your clipboard.
You can also copy the whole conversation.


#### Prompt mode
Prompt mode allows you to use a selected piece of text from your note as input for the assistant.
From here you can ask the assistant to translate, summarize, generate code ect.

## Limitations
This plugin is currently not compatible with iPadOS.
