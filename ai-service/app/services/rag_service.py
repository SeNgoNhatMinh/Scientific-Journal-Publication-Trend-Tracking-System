import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
from langchain_community.utilities.arxiv import ArxivAPIWrapper
from app.utils.mongodb_client import get_db

# Initialize Gemini Chat Model
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    temperature=0.3,
    max_output_tokens=1024,
    google_api_key=os.getenv("GEMINI_API_KEY")
)

@tool
async def search_database_papers(query: str) -> str:
    """Search for relevant academic papers in the local MongoDB database. 
    Use this first to find papers already in the system.
    """
    db = await get_db()
    
    papers = []
    try:
        cursor = db.papers.find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}, "title": 1, "abstract": 1, "publication_year": 1, "doi": 1}
        ).sort([("score", {"$meta": "textScore"})]).limit(5)
        papers = await cursor.to_list(length=5)
    except Exception as e:
        print(f"MongoDB text search error (likely missing index): {e}")
        papers = []

    if not papers:
        # Fallback to regex if text index is missing or no results
        try:
            cursor = db.papers.find(
                {"title": {"$regex": query, "$options": "i"}},
                {"title": 1, "abstract": 1, "publication_year": 1, "doi": 1}
            ).limit(5)
            papers = await cursor.to_list(length=5)
        except Exception as fallback_e:
            print(f"MongoDB regex search error: {fallback_e}")
            papers = []

    if not papers:
        return "No relevant papers found in the local database."
    
    result = []
    for p in papers:
        doi = p.get('doi')
        url_link = p.get('url') or (f"https://doi.org/{doi}" if doi else "No URL available")
        result.append(f"Title: {p.get('title')}\nYear: {p.get('publication_year')}\nDOI: {doi}\nURL: {url_link}\nAbstract: {p.get('abstract')}")
    
    return "\n\n---\n\n".join(result)

import arxiv

@tool
def search_arxiv(query: str) -> str:
    """Search the ArXiv API for external academic papers. 
    Use this if the local database does not have enough information.
    """
    try:
        client = arxiv.Client()
        search = arxiv.Search(query=query, max_results=3, sort_by=arxiv.SortCriterion.Relevance)
        results = []
        for r in client.results(search):
            results.append(f"Title: {r.title}\nAuthors: {', '.join(a.name for a in r.authors)}\nPublished: {r.published.date()}\nURL: {r.entry_id}\nAbstract: {r.summary}")
        if not results:
            return "No relevant papers found on ArXiv."
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"Error fetching from ArXiv: {e}"

from bson import ObjectId
from langchain.prompts import PromptTemplate
from langchain.agents import create_react_agent, AgentExecutor

@tool
async def get_user_workspaces(user_id: str) -> str:
    """Fetch the list of workspaces owned by the current user. Returns workspace name, description and visibility."""
    if not user_id or user_id == "Not logged in":
        return "You must be logged in to access personal workspaces."
    db = await get_db()
    try:
        cursor = db.workspaces.find({"owner": ObjectId(user_id)}, {"name": 1, "description": 1, "visibility": 1})
        workspaces = await cursor.to_list(length=10)
        if not workspaces:
            return "You have no workspaces."
        res = [f"- Workspace '{w.get('name')}': {w.get('description', 'No description')} (Visibility: {w.get('visibility')})" for w in workspaces]
        return "\n".join(res)
    except Exception as e:
        return f"Error fetching workspaces: {e}"

@tool
async def get_user_alerts(user_id: str) -> str:
    """Fetch the list of keyword alerts the current user has set up for their workspaces."""
    if not user_id or user_id == "Not logged in":
        return "You must be logged in to access alerts."
    db = await get_db()
    try:
        cursor = db.workspacealerts.find({"createdBy": ObjectId(user_id)}, {"keyword": 1, "type": 1, "notifyEnabled": 1})
        alerts = await cursor.to_list(length=10)
        if not alerts:
            return "You have no active alerts."
        res = [f"- Alert for keyword '{a.get('keyword')}' (Type: {a.get('type')}, Enabled: {a.get('notifyEnabled')})" for a in alerts]
        return "\n".join(res)
    except Exception as e:
        return f"Error fetching alerts: {e}"

@tool
async def get_user_notes(user_id: str) -> str:
    """Fetch the personal research notes created by the current user."""
    if not user_id or user_id == "Not logged in":
        return "You must be logged in to access notes."
    db = await get_db()
    try:
        cursor = db.workspacenotes.find({"createdBy": ObjectId(user_id)}, {"title": 1, "content": 1})
        notes = await cursor.to_list(length=10)
        if not notes:
            return "You have no notes."
        res = [f"- Note '{n.get('title', 'Untitled')}': {n.get('content')}" for n in notes]
        return "\n".join(res)
    except Exception as e:
        return f"Error fetching notes: {e}"

tools = [search_database_papers, search_arxiv, get_user_workspaces, get_user_alerts, get_user_notes]

prompt = PromptTemplate.from_template("""You are an expert academic AI assistant for the "Scientific Journal Publication Trend Tracking System".
This website helps users track scientific publication trends, manage personal Research Workspaces, save papers, create personal notes, and set up keyword alerts (Mobile/Email notifications).
Our system database stores papers curated from OpenAlex, IEEE, and user imports.

You have access to the following tools:

{tools}

If the user asks about the website's features, you can answer directly based on this system description.
If the user asks about their own data (workspaces, alerts, notes), you MUST use the respective tools (`get_user_workspaces`, `get_user_alerts`, `get_user_notes`).
The current user's ID is: {user_id}. You MUST pass this exact ID as the Action Input to the personal data tools.

When answering about academic papers, you MUST ALWAYS provide a highly structured and readable format, including the Title, Authors, Publication Date, Summary, and a direct URL link to the paper.
Always cite your sources in the text using bracket numbers like [1], [2] when mentioning facts from papers.

To use a tool, you MUST use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

If you do not need to use a tool, or you already know the answer, just output Final Answer directly.

Begin!

Question: {input}
Thought: {agent_scratchpad}""")

# Create Agent using ReAct to avoid strict Gemini tool calling schema errors
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)

async def ask_assistant(question: str, user_id: str = None) -> dict:
    """Process the user's question using the RAG Agent."""
    try:
        response = await agent_executor.ainvoke({
            "input": question, 
            "user_id": user_id or "Not logged in"
        })
        return {
            "answer": response.get("output", "No response generated."),
            "sources": [] # The LLM will embed citations in the answer text directly
        }
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"Agent error: {err_msg}")
        return {
            "answer": f"Sorry, an error occurred while processing your request. Error details: {str(e)}",
            "sources": []
        }
