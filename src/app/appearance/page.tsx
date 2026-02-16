'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AppearancePage() {
    return (
        <div>
            <h1 className="text-3xl font-bold font-headline">Appearance</h1>
            <p className="text-muted-foreground">
                Customize the look and feel of the application.
            </p>
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Select a theme for the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Theme customization is not yet available.</p>
                </CardContent>
            </Card>
        </div>
    )
}
