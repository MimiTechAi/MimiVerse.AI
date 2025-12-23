import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AuthPage() {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, type: "login" | "register") => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch(`/api/auth/${type}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || "Authentication failed");
            }

            toast.success(type === "login" ? "Welcome back!" : "Account created!");
            login(result);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Mimiverse IDE</CardTitle>
                    <CardDescription>Login to access your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={(e) => handleSubmit(e, "login")} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-username">Username</Label>
                                    <Input
                                        id="login-username"
                                        name="username"
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Password</Label>
                                    <Input
                                        id="login-password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Logging in..." : "Login"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register">
                            <form onSubmit={(e) => handleSubmit(e, "register")} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="register-username">Username</Label>
                                    <Input
                                        id="register-username"
                                        name="username"
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="register-password">Password</Label>
                                    <Input
                                        id="register-password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Creating Account..." : "Create Account"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
