"use server";

export async function triggerIntakeAnalysis(
  jobId: string,
  orgId: string,
  formData: {
    contact_name?: string;
    company_name?: string;
    services_requested: string[];
    budget_range?: string;
    timeline?: string;
    goals_summary?: string;
  },
  leadId?: string,
) {
  const token = process.env.VOS_HOOKS_TOKEN || process.env.OPENCLAW_TOKEN;
  if (!token) {
    console.error("triggerIntakeAnalysis: no server-side token configured");
    return { success: false, error: "missing_token" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://www.thenorthbridgemi.com";

  try {
    const res = await fetch(`${baseUrl}/api/openclaw/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        agent_id: "main",
        message: `Analyze this client intake form and generate a recommendation report. Client: ${formData.contact_name || "Unknown"}, Company: ${formData.company_name || "Unknown"}, Services requested: ${formData.services_requested.join(", ")}, Budget: ${formData.budget_range || "Not specified"}, Timeline: ${formData.timeline || "Not specified"}, Goals: ${formData.goals_summary || "Not specified"}. Return JSON with: recommended_services, recommended_tier, estimated_monthly_value, risk_factors, opportunities, next_steps, and executive_summary.`,
        organization_id: orgId,
        context: {
          job_id: jobId,
          job_type: "intake_analysis",
          lead_id: leadId,
          callback_url: `${baseUrl}/api/openclaw/webhook`,
        },
      }),
    });

    if (!res.ok) {
      return { success: false, error: `trigger_failed_${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("triggerIntakeAnalysis error:", err);
    return { success: false, error: "fetch_error" };
  }
}
