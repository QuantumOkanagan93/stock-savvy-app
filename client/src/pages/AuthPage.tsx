import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import "./AuthPage.css";

export default function AuthPage() {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, signup } = useAuth();
    const navigate = useNavigate();

    function switchMode(next: "login" | "signup") {
        setMode(next);
        setFieldErrors({});
        setFormError(null);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFieldErrors({});
        setFormError(null);
        setIsSubmitting(true);

        try {
            if (mode === "signup") {
                await signup(email, password);
            } else {
                await login(email, password);
            }
            navigate("/");
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.fieldErrors) {
                    setFieldErrors(err.fieldErrors);
                } else {
                    setFormError(err.message);
                }
            } else {
                setFormError("Something went wrong. Please try again");
            }
        } finally {
            setIsSubmitting(false);
        }
    }
}