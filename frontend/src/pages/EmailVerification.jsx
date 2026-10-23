import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import FormInput from "../components/FormInput";
import { clearError, clearLoading, resendVerification, verifyEmail } from "../store/authSlice";

const EMPTY_CODE = ["", "", "", "", "", ""];

const EmailVerification = () => {
    const [code, setCode] = useState(EMPTY_CODE);
    const inputRefs = useRef([]);
    const navigate = useNavigate();

    const dispatch = useDispatch();
    const { isLoading, error, message, pendingEmail } = useSelector((state) => state.auth);
    // The code is bound to an e-mail address: prefilled after sign-up, typed otherwise (e.g. after a reload).
    const [email, setEmail] = useState(pendingEmail ?? "");

    useEffect(() => {
        dispatch(clearError());
        dispatch(clearLoading());
    }, [dispatch]);

    const submit = async (digits) => {
        const resultAction = await dispatch(verifyEmail({ email, code: digits.join("") }));
        if (verifyEmail.fulfilled.match(resultAction)) {
            navigate("/login", { replace: true, state: { notice: resultAction.payload.message } });
        } else {
            setCode(EMPTY_CODE);
            inputRefs.current[0]?.focus();
        }
    };

    const updateCode = (newCode) => {
        setCode(newCode);
        // Auto submit once the 6 digits are there
        if (email && newCode.every((digit) => digit !== "")) submit(newCode);
    };

    const handleChange = (index, value) => {
        const newCode = [...code];

        if (/^\d$/.test(value)) {
            newCode[index] = value;
            updateCode(newCode);
            if (index < 5) inputRefs.current[index + 1].focus();
        } else if (value === "") {
            newCode[index] = "";
            setCode(newCode);
            if (index > 0) inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (index, e) => {
        e.preventDefault();
        const pastedCode = e.clipboardData.getData("Text").replace(/\D/g, "").slice(0, 6 - index).split("");
        const newCode = [...code];
        pastedCode.forEach((digit, idx) => {
            newCode[index + idx] = digit;
        });

        const lastFilledIndex = newCode.findLastIndex((digit) => digit !== "");
        inputRefs.current[Math.min(lastFilledIndex + 1, 5)].focus();
        updateCode(newCode);
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submit(code);
    };

    const handleResend = () => {
        if (email) dispatch(resendVerification({ email }));
    };

    return (
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md"
            >
                <h2 className="text-3xl font-bold mb-6 text-center bg-linear-to-r from-green-300 to-emerald-600 text-transparent bg-clip-text">
                    Verify Your Email
                </h2>
                <p className="text-center text-gray-300 mb-6">
                    {pendingEmail ? (
                        <>
                            Enter the 6-digit code sent to <span className="font-semibold">{pendingEmail}</span>. It expires in 15 minutes.
                        </>
                    ) : (
                        "Enter your e-mail address and the 6-digit code you received."
                    )}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!pendingEmail && (
                        <FormInput
                            icon={Mail}
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    )}

                    <div className="flex justify-between">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                autoComplete={index === 0 ? "one-time-code" : "off"}
                                aria-label={`Digit ${index + 1}`}
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={(e) => handlePaste(index, e)}
                                className="w-12 h-12 text-center text-2xl font-bold bg-gray-700 text-white border-2 border-gray-600 rounded-lg focus:border-green-500 focus:outline-hidden"
                            />
                        ))}
                    </div>

                    {error && <p className="text-red-500 font-semibold mt-2">{error}</p>}
                    {message && !error && <p className="text-green-400 text-sm mt-2">{message}</p>}

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={isLoading || !email || code.some((digit) => !digit)}
                        className="w-full bg-linear-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-hidden focus:ring-1 focus:ring-green-500/50 disabled:opacity-50"
                    >
                        {isLoading ? "Verifying..." : "Verify Email"}
                    </motion.button>
                </form>

                <div className="mt-6 flex justify-between text-sm">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isLoading || !email}
                        className="text-green-400 hover:underline disabled:opacity-50"
                    >
                        Resend the code
                    </button>
                    <Link to="/login" className="text-green-400 hover:underline">
                        Back to Login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default EmailVerification;
