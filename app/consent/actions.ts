"use server";

import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export async function updateConsent(formData: FormData) {
    const consentStatus = formData.get("consent_status");

    if (consentStatus !== "accepted" && consentStatus !== "declined") {
        throw new Error("Invalid consent status.");
    }

    const supabase = await createClient();
    const {data} = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (!userId) {
        redirect("/login");
    }

    const {error} = await supabase.from("profile").update({consent_status: consentStatus}).eq("user_id", userId);

    if (error) {
        throw new Error(error.message);
    }

    redirect("/student/agenda");
        
}