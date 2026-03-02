import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { getAuthState } from "@/lib/auth";
import { login } from "@/lib/apiClient";
import { Eye, EyeOff, Lock, User, LogIn } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname ?? "/";
  }, [location.state]);

  const [formData, setFormData] = useState<{ username: string; password: string }>({
    username: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const auth = getAuthState();
    if (auth.isAuthenticated && auth.role) {
      navigate(auth.role === "admin" ? "/admin" : "/manager", { replace: true });
    }
  }, [navigate]);

  const onLogin = async () => {
    if (!formData.username || !formData.password) return;
    setIsLoading(true);
    try {
      setError(null);
      const result = await login(formData.username, formData.password);
      const defaultLanding = result.role === "admin" ? "/admin" : "/manager";
      const nextPath = redirectTo && redirectTo !== "/" && redirectTo !== "/login" ? redirectTo : defaultLanding;
      navigate(nextPath, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onLogin();
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const cardVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 50 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 1,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  const errorVariants = {
    hidden: { opacity: 0, x: -20, height: 0 },
    visible: { opacity: 1, x: 0, height: "auto" },
    exit: { opacity: 0, x: 20, height: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 
                 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800
                 flex items-center justify-center p-3 sm:p-4 md:p-6
                 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -45, 0],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
            delay: 2
          }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Responsive Card - Mobile first */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[90%] sm:max-w-md md:max-w-lg"
      >
        <motion.div
          variants={cardVariants}
          whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
          transition={{ duration: 0.3 }}
        >
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-950/90 
                         shadow-xl border border-white/20 dark:border-slate-800/50
                         overflow-hidden">
            <CardHeader className="space-y-1.5 sm:space-y-2 p-6 sm:p-8">
              <motion.div variants={itemVariants}>
                <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight
                                   bg-gradient-to-r from-slate-900 to-slate-600 
                                   dark:from-slate-100 dark:to-slate-400
                                   bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <CardDescription className="text-sm sm:text-base md:text-lg text-muted-foreground">
                  Sign in to continue to TaskFlow
                </CardDescription>
              </motion.div>
            </CardHeader>
            
            <CardContent className="space-y-5 sm:space-y-6 p-6 sm:p-8 pt-0 sm:pt-0">
              {/* Username Field */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                 text-slate-400 group-hover:text-accent transition-colors duration-200"
                       size={18} />
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="h-11 sm:h-12 text-sm sm:text-base 
                             pl-10 pr-4
                             bg-white/50 dark:bg-slate-900/50
                             border-slate-200 dark:border-slate-700
                             focus:border-accent focus:ring-2 focus:ring-accent/20
                             transition-all duration-300
                             group-hover:border-accent/50"
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                 text-slate-400 group-hover:text-accent transition-colors duration-200"
                       size={18} />
                  <Input
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onKeyPress={handleKeyPress}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-11 sm:h-12 text-sm sm:text-base 
                             pl-10 pr-12
                             bg-white/50 dark:bg-slate-900/50
                             border-slate-200 dark:border-slate-700
                             focus:border-accent focus:ring-2 focus:ring-accent/20
                             transition-all duration-300
                             group-hover:border-accent/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2
                             text-slate-400 hover:text-accent
                             transition-all duration-200
                             focus:outline-none focus:text-accent
                             p-1 rounded-full hover:bg-accent/10"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <motion.div
                      initial={false}
                      animate={{ rotate: showPassword ? 180 : 0 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </motion.div>
                  </button>
                </div>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="rounded-lg bg-destructive/10 p-3 border border-destructive/20"
                  >
                    <p className="text-sm text-destructive break-words">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Button */}
              <motion.div variants={itemVariants}>
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    className="w-full bg-gradient-to-r from-accent to-accent/80
                             hover:from-accent/90 hover:to-accent/70
                             text-accent-foreground 
                             h-12 sm:h-14 text-base sm:text-lg font-semibold
                             shadow-lg shadow-accent/25
                             disabled:opacity-70 disabled:cursor-not-allowed
                             relative overflow-hidden group"
                    onClick={onLogin}
                    disabled={isLoading}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="flex items-center justify-center space-x-2"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Logging in...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="login"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="flex items-center justify-center space-x-2"
                        >
                          <LogIn size={20} />
                          <span>Login</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Animated shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        repeatDelay: 3
                      }}
                    />
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}