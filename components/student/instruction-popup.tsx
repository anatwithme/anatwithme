"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { set } from "lodash";

type InstructionPopupProps = {
    studentId: string;
    popupId: string;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
};

export default function InstructionPopup({
    studentId,
    popupId,
    title,
    description,
    actionLabel,
    actionHref,
}: InstructionPopupProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const storageKey = `student-instruction:${studentId}:${popupId}`;

    useEffect(() => {
        const hasDismissedPopup = window.localStorage.getItem(storageKey) === "dismissed";

        if(!hasDismissedPopup) {
            setIsOpen(true);
        }

        setIsReady(true);
    }, [storageKey]);

    function dismissPopup() {
        window.localStorage.setItem(storageKey, "dismissed");
        setIsOpen(false);
    }

    function handleAction() {
        dismissPopup();
        if (actionHref) {
            router.push(actionHref);
        }
    }

    if(!isReady || !isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${popupId}-title`}
        >
            <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
                <div className="space-y-3">
                    <h2 id={`${popupId}-title`} className="text-xl font-semibold tracking-tight">
                        {title}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className="mt-6 flexflex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={dismissPopup}>
                        Got it
                    </Button>
                    {actionLabel && actionHref ? (
                        <Button type="button" onClick={handleAction}>
                            {actionLabel}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}