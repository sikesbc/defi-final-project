// Supabase Edge Function for scheduled data refresh
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // Get the API URL from environment variables
    const apiUrl = Deno.env.get("API_URL") || "http://localhost:8000";
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");

    console.log("Starting scheduled data refresh...");

    // Call the FastAPI backend refresh endpoint
    const response = await fetch(`${apiUrl}/api/v1/attacks/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": serviceKey || "",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Refresh failed:", data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.detail || "Refresh failed",
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Refresh completed successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in refresh function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

