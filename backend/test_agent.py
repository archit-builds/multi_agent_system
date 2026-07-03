import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from agents import build_search_agent

async def test():
    print("Building agent...")
    agent = build_search_agent()
    print("Invoking agent...")
    try:
        res = agent.invoke({"messages": [("user", "Find recent information about spaceX")]})
        print("Agent invoke completed!")
        
        # Serialize to dict manually if it's a list of Langchain messages
        # Just write out string representations
        out = []
        for msg in res.get("messages", []):
            out.append({"type": msg.type, "content": msg.content})
        
        with open("test_output.json", "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
            
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test())
