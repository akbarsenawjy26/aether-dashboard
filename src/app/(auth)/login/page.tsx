"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/authStore";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await authApi.login(data);
      const { access_token, refresh_token } = response.data.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      // Fetch user profile
      const { data: userData } = await authApi.getMe();
      setUser(userData.data);

      toast.success("Login berhasil!");
      router.push("/dashboard/realtime");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Login gagal. Silakan coba lagi.");
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent sm:bg-card/40 sm:backdrop-blur-xl sm:border sm:border-white/5 sm:shadow-2xl sm:rounded-3xl transition-all duration-500 hover:bg-card/50">
      <CardHeader className="space-y-2 text-center sm:text-left pb-8">
        <div className="flex justify-center sm:justify-start mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
        </div>
        <CardTitle className="text-3xl font-black tracking-tight text-foreground">Masuk</CardTitle>
        <CardDescription className="text-base">
          Akses dashboard monitoring Aether Node.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest opacity-70">Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="admin@aether.io" 
                        className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl transition-all"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest opacity-70">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl transition-all"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Otentikasi..." : "Akses Dashboard"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-6 pt-8">
        <div className="flex items-center justify-between w-full text-xs font-medium">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">
            Lupa password?
          </Link>
          <Link href="/register" className="text-primary font-bold hover:underline">
            Buat Akun
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}