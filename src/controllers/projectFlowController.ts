import { Request, Response } from "express";

const PROJECT_FLOW_API = "http://apiprojectflow.semantic.com.ar";
const PROJECT_FLOW_EMAIL = "US_Admin@gmail.com";
const PROJECT_FLOW_PASSWORD = "SoTheGoodPassword123!";

let cachedCookie: string | null = null;
let tokenExpiry: number = 0;


async function getProjectFlowCookie(): Promise<string> {
  if (cachedCookie && Date.now() < tokenExpiry) {
    return cachedCookie;
  }
  
  try {
    const response = await fetch(`${PROJECT_FLOW_API}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: PROJECT_FLOW_EMAIL,
        password: PROJECT_FLOW_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ProjectFlow authentication failed:", response.status, errorText);
      throw new Error(`Failed to authenticate with ProjectFlow API: ${response.status}`);
    }

    const setCookieHeader = response.headers.get("set-cookie");
    
    if (!setCookieHeader) {
      throw new Error("No session cookie received from ProjectFlow API");
    }

    cachedCookie = setCookieHeader.split(";")[0];
    tokenExpiry = Date.now() + 60 * 60 * 1000;

    return cachedCookie as string;
  } catch (error) {
    console.error("ProjectFlow authentication error:", error);
    throw error;
  }
}

export async function getTasks(req: Request, res: Response) {
  try {
    const cookie = await getProjectFlowCookie();

    const response = await fetch(`${PROJECT_FLOW_API}/task/getOwned`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error fetching tasks from ProjectFlow:", response.status, errorText);
      return res.status(response.status).json({ 
        message: "Error fetching tasks from ProjectFlow",
        details: errorText
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function getTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const cookie = await getProjectFlowCookie();

    const response = await fetch(`${PROJECT_FLOW_API}/task/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error fetching task from ProjectFlow:", response.status, errorText);
      return res.status(response.status).json({ 
        message: "Error fetching task from ProjectFlow",
        details: errorText
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function createTask(req: Request, res: Response) {
  try {
    const { title, description, deadline } = req.body;
    const cookie = await getProjectFlowCookie();

    if (!title || !description || !deadline) {
      return res.status(400).json({ 
        message: "Title, description, and deadline are required" 
      });
    }

    const formattedDeadline = deadline.includes('Z') || deadline.includes('+') 
      ? deadline 
      : new Date(deadline).toISOString();

    const response = await fetch(`${PROJECT_FLOW_API}/task/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
      body: JSON.stringify({
        title,
        description,
        deadline: formattedDeadline,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating task in ProjectFlow:", response.status, errorText);
      return res.status(response.status).json({ 
        message: "Error creating task in ProjectFlow",
        details: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function createSubTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { title, description, deadline } = req.body;
    const cookie = await getProjectFlowCookie();

    if (!title || !description || !deadline) {
      return res.status(400).json({ 
        message: "Title, description, and deadline are required" 
      });
    }

    const formattedDeadline = deadline.includes('Z') || deadline.includes('+') 
      ? deadline 
      : new Date(deadline).toISOString();

    const response = await fetch(`${PROJECT_FLOW_API}/task/${taskId}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
      body: JSON.stringify({
        title,
        description,
        deadline: formattedDeadline,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating subtask in ProjectFlow:", response.status, errorText);
      return res.status(response.status).json({ 
        message: "Error creating subtask in ProjectFlow",
        details: errorText
      });
    }

    const data = await response.json();
    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating subtask:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function updateTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    const cookie = await getProjectFlowCookie();

    const response = await fetch(`${PROJECT_FLOW_API}/task/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error updating task in ProjectFlow:", response.status, errorText);
      return res.status(response.status).json({ 
        message: "Error updating task in ProjectFlow",
        details: errorText
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function deleteTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const cookie = await getProjectFlowCookie();

    const response = await fetch(`${PROJECT_FLOW_API}/task/${taskId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error deleting task in ProjectFlow:", response.status, errorText);
      return res.status(response.status).json({ 
        message: "Error deleting task in ProjectFlow",
        details: errorText
      });
    }

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
