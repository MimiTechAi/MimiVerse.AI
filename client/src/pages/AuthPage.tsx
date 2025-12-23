import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Zap, Bot, Code2, ArrowRight } from "lucide-react";

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

            toast.success(type === "login" ? "Welcome back to the Mimiverse!" : "Your Mimiverse account is ready!");
            login(result);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-4 shadow-lg shadow-purple-500/20">
                        <Code2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Mimi Engine</h1>
                    <p className="text-zinc-400 mt-2">Beyond standard reasoning.</p>
                </div>

                <Card className="bg-[#111118]/80 border-white/10 backdrop-blur-2xl shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl text-center">Authentication</CardTitle>
                        <CardDescription className="text-center text-zinc-500">
                            Enter the Mimi ecosystem
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/20 p-1 border border-white/5">
                                <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-black transition-all">Login</TabsTrigger>
                                <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-black transition-all">Register</TabsTrigger>
                            </TabsList>

                            <AnimatePresence mode="wait">
                                <TabsContent value="login">
                                    <motion.form
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onSubmit={(e) => handleSubmit(e, "login")}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="login-username">Username</Label>
                                                <Input
                                                    id="login-username"
                                                    name="username"
                                                    autoComplete="username"
                                                    placeholder="Your username"
                                                    className="bg-black/20 border-white/10 focus:border-purple-500 transition-colors"
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
                                                    placeholder="••••••••"
                                                    className="bg-black/20 border-white/10 focus:border-purple-500 transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 mt-4 group" disabled={isLoading}>
                                            {isLoading ? "Validating..." : (
                                                <span className="flex items-center gap-2">
                                                    Enter Mimiverse <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            )}
                                        </Button>
                                    </motion.form>
                                </TabsContent>

                                <TabsContent value="register">
                                    <motion.form
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onSubmit={(e) => handleSubmit(e, "register")}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="register-username">Username</Label>
                                                <Input
                                                    id="register-username"
                                                    name="username"
                                                    autoComplete="username"
                                                    placeholder="Choose a username"
                                                    className="bg-black/20 border-white/10 focus:border-purple-500 transition-colors"
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
                                                    placeholder="At least 8 characters"
                                                    className="bg-black/20 border-white/10 focus:border-purple-500 transition-colors"
                                                    required
                                                    minLength={8}
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white mt-4 border-none" disabled={isLoading}>
                                            {isLoading ? "Forging Account..." : "Create Mimi Account"}
                                        </Button>
                                    </motion.form>
                                </TabsContent>
                            </AnimatePresence>
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                        <Zap className="w-5 h-5 text-purple-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Ultra Fast</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                        <ShieldCheck className="w-5 h-5 text-blue-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Secure</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
