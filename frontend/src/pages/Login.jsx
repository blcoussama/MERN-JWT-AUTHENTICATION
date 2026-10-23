import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Loader } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormInput from "../components/FormInput";
import { useDispatch, useSelector } from "react-redux";
import { clearError, clearLoading, login } from "../store/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notice = useLocation().state?.notice; // e.g. "E-mail verified successfully"

  const { isLoading, error } = useSelector((state) => state.auth); // Access Redux state

  useEffect(() => {
      // Clear Error when component mounts
      dispatch(clearError()); // Dispatch an action to clear error (defined in Redux slice)
      // Clear Loading when component mounts
      dispatch(clearLoading());// Dispatch an action to clear the loading (define in Redux slice)

    }, [dispatch]);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await dispatch(login({ email, password })).unwrap();
      navigate("/"); // "/" redirects to the dashboard of the user's role
    } catch (err) {
      // Right password but e-mail not verified yet: go and enter the code
      if (err?.code === "EMAIL_NOT_VERIFIED") navigate("/verify-email");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-linear-to-r from-green-300 to-emerald-700 text-transparent bg-clip-text">
          Welcome Back
        </h2>

        <form onSubmit={handleLogin}>
          {/* Email Input */}
          <FormInput
            icon={Mail}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {/* Password Input */}
          <FormInput
            icon={Lock}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {/* Forgot Password Link */}
          <div className="flex items-center mb-6">
            <Link
              to="/forgot-password"
              className="text-sm text-green-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* API Error / success notice */}
          {error && (<p className="text-red-500 font-semibold mb-2">{error}</p>)}
          {notice && !error && (<p className="text-green-400 font-semibold mb-2">{notice}</p>)}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-linear-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-hidden focus:ring-1 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="size-6 animate-spin mx-auto" />
            ) : (
              "Login"
            )}
          </motion.button>
        </form>
      </div>

      {/* Redirect to Sign-Up */}
      <div className="px-8 py-4 bg-gray-900/50 flex justify-center">
        <p className="text-sm text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-base text-green-400 hover:underline ml-2"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default Login;
