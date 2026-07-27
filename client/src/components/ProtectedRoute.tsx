import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children}: { children: ReactNode}) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        //Avoid a flash re-direct to /login while the initial getMe() call is still in flight on page load/refresh
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    return <>
        {children}
    </>;
}