import { updateConsent } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConsentPage() {
    return (
    <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Research Data Consent</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="space-y-4 text-sm leading-6">
                    <p>
                        Anatwithme is being used as part of a research study. This study may analyze information 
                        collected through your use of this website, such as agenda activity and progress data.
                    </p>

                    <p>
                        Your choice is voluntary. You may choose whether or not to consent to your data being used for research purposes.
                    </p>

                    <p>
                        Choosing yes or no will not prevent you from using this website.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <form action={updateConsent}>
                        <input type="hidden" name="consent_status" value="accepted" />
                        <Button type="submit">I Consent</Button>
                    </form>

                    <form action={updateConsent}>
                        <input type="hidden" name="consent_status" value="declined" />
                        <Button variant="outline" type="submit">I Do Not Consent</Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    </div>
    );
}
