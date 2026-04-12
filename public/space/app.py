import gradio as gr
import requests

def answer(question):
    """Query Avena Property LLM via the Avena Terminal API."""
    try:
        res = requests.post(
            "https://avenaterminal.com/api/model/infer",
            json={"prompt": question},
            timeout=30
        )
        data = res.json()
        response = data.get("response", "Error: No response received")
        model = data.get("model", "avena-property-1b")
        return f"{response}\n\n---\nModel: {model} | Source: avenaterminal.com"
    except Exception as e:
        return f"Error connecting to Avena Terminal API: {str(e)}"

demo = gr.Interface(
    fn=answer,
    inputs=gr.Textbox(
        placeholder="Should I buy a villa in Orihuela Costa at €280k? What's the yield outlook?",
        label="Ask Avena Property LLM",
        lines=2
    ),
    outputs=gr.Textbox(label="Avena Analysis", lines=8),
    title="🧬 Avena Property LLM",
    description="Europe's first property investment language model. Trained on 1,000+ expert pairs covering Costa Blanca, Costa Calida and Costa del Sol. Built by [Avena Terminal](https://avenaterminal.com).",
    examples=[
        ["Is a 22% discount in Orihuela Costa a good deal?"],
        ["What rental yield can I expect in Calpe?"],
        ["How does the ECB rate affect Spanish property?"],
        ["Compare buying in Costa Blanca vs Costa del Sol"],
        ["What taxes do UK buyers pay in Spain?"],
        ["Best 3-bed villas under €300k with high score?"],
        ["Is now a good time to buy property in Spain?"],
        ["What is the Avena Investment Score?"],
    ],
    theme=gr.themes.Base(),
    article="**About:** Avena Terminal (avenaterminal.com) scores and ranks 1,881 new build properties across Spain's coastal markets. DOI: 10.5281/zenodo.19520064 | License: Apache 2.0"
)

demo.launch()
