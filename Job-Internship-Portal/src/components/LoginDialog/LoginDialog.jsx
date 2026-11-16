import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { notifyAuthStateChanged } from "../../lib/authEvents";
import LoginForm from "../LoginForm/LoginForm";

function LoginDialog() {
    const [open, setOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (searchParams.get("login") === "true") {
            setOpen(true);
        }
    }, [searchParams]);

    const handleOpenChange = (nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen && searchParams.get("login") === "true") {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("login");
            setSearchParams(nextParams, { replace: true });
        }
    };

    const handleLoginSuccess = () => {
        setOpen(false);
        notifyAuthStateChanged();
        navigate("/", { replace: true });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger className="cursor-pointer rounded-md border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50">
                Login
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <LoginForm onLoginSuccess={handleLoginSuccess} />
            </DialogContent>
        </Dialog>
    );
}

export default LoginDialog;
