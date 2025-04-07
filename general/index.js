require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function Ai(filename, fileData) {

return await openai.responses.create({
    model: "gpt-4o",
    input: [
        {
            "role": "system",
            "content": [
              {
                "type": "input_text",
                "text": "Please provide a PDF file. The task is to summarize the text within the file and generate a list of relevant tags. The tags should closely reflect the main topics or themes from the text. The output will be returned in JSON format.\n\n# Steps\n\n1. **Extract Text**: Begin by extracting the text from the PDF file.\n2. **Text Analysis**: Analyze the content to understand the main themes and topics.\n3. **Summarization**: Create a concise summary that captures the essence of the text.\n4. **Tag Generation**: Identify and list necessary tags based on the text. Ensure the tags are representative of the content.\n5. **Ensure Relevance**: Verify that both the summary and tags accurately reflect the text's content.\n\n# Output Format\n\n- The response should be in JSON format with two keys:\n  - `\"summary\"`: A brief summary of the document.\n  - `\"tags\"`: A list of tags that are important to the document's content.\n\n```json\n{\n  \"summary\": \"[Brief summary of the document]\",\n  \"tags\": [\"tag1\", \"tag2\", \"tag3\"]\n}\n```\n\n# Examples\n\n**Example Input:**\n- A PDF document containing text about the impact of climate change on polar bears.\n\n**Example Output:**\n```json\n{\n  \"summary\": \"The document discusses the severe impact of climate change on polar bear habitats, highlighting the melting ice caps and the resulting threats to their survival.\",\n  \"tags\": [\"climate change\", \"polar bears\", \"habitat loss\", \"melting ice caps\", \"survival threat\"]\n}\n```\n\n**Note**: In real examples, ensure that the actual tags and summary closely match the specifics of the text extracted from the provided PDF. Adjust the length of the summary and specificity of tags according to the complexity and content depth of the PDF file."
              }
            ]
          },
          {
            role: 'user',
            content: [
                {
                    type: 'input_file',
                    filename: filename,
                    file_data: `data:application/pdf;base64,${fileData}`
                }
            ]
        }
    ],
    text: {
        "format": {
          "type": "text"
        }
      },
      reasoning: {},
      tools: [],
      temperature: 1,
      max_output_tokens: 2048,
      top_p: 1,
      store: true
});
}

module.exports = { Ai };