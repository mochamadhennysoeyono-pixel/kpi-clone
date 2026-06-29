// src/lib/actions.ts
"use server";

export async function triggerJob(targetEmployeeIds: string[] | null, templateId: string | null): Promise<any> {
    try {
        const payload = { targetEmployeeIds, templateId };

        // Use a relative URL for fetching within the same application on the server.
        // The fetch call in a Server Action on App Hosting can resolve this correctly.
        const url = `/api/cron/notifications`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            } else {
                const text = await response.text();
                throw new Error(`Request failed with status ${response.status}: ${text.substring(0, 100)}`);
            }
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return { success: true, data };
        } else {
            return { success: false, data: { error: "Response was not JSON" } };
        }

    } catch (error: any) {
        console.error("SERVER ACTION FAILED:", error);
        return { success: false, data: { error: error.message || "An unknown error occurred." } };
    }
}


export async function extractGoogleDocData(urlOrFormData: string | FormData): Promise<{ placeholders: string[], contentHtml: string }> {
    console.warn("extractGoogleDocData is currently disabled as 'mammoth' has been removed.");
    if (typeof urlOrFormData === 'string') {
        const response = await fetch(urlOrFormData);
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Doc: ${response.statusText}`);
        }
        const contentHtml = await response.text();
        const placeholders = Array.from(contentHtml.matchAll(/{{(.*?)}}/g)).map(match => match[1]);
        return { placeholders: [...new Set(placeholders)], contentHtml };
    } else {
        return {
            placeholders: [],
            contentHtml: '<p><em>Document conversion from .docx is temporarily unavailable.</em></p>'
        };
    }
}
