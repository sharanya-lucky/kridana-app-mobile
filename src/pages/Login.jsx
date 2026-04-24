import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import { ArrowLeft } from "lucide-react";
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get("role") || "user";

  const [formData, setFormData] = useState({ emailPhone: "", password: "" });

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        formData.emailPhone,
        formData.password,
      );

      const user = cred.user;

      const trainerSnap = await getDoc(doc(db, "trainers", user.uid));
      const instituteSnap = await getDoc(doc(db, "institutes", user.uid));
      const familySnap = await getDoc(doc(db, "families", user.uid));

      let actualRole = null;
      if (trainerSnap.exists()) actualRole = "trainer";
      if (instituteSnap.exists()) actualRole = "institute";
      if (familySnap.exists()) actualRole = "family";
      if (!actualRole && role === "user") actualRole = "user";

      if (role !== "user" && actualRole !== role && actualRole !== "family") {
        alert(`Role mismatch. Registered as ${actualRole}`);
        return;
      }

      if (actualRole !== "user" && actualRole !== "family") {
        const planSnap = await getDoc(doc(db, "plans", user.uid));

        if (!planSnap.exists()) {
          navigate("/plans");
          return;
        }

        const plan = planSnap.data();
        const now = Date.now();

        if (
          plan.currentPlan?.endDate?.toMillis() < now ||
          plan.currentPlan?.status === "expired"
        ) {
          navigate("/plans?expired=true");
          return;
        }
      }

      if (actualRole === "family") {
        navigate("/");
        return;
      }

      const studentSnap = await getDoc(doc(db, "students", user.uid));

      if (studentSnap.exists() && studentSnap.data().defaultPassword) {
        navigate("/reset-password");
        return;
      }

      if (actualRole === "trainer") navigate("/trainers/dashboard");
      else if (actualRole === "institute") navigate("/institutes/dashboard");
      else navigate("/");
    } catch (err) {
      console.error(err);

      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        alert("Wrong password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        alert("No account found with this email.");
      } else {
        alert("Login failed: " + err.message);
      }
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Enter your registered email:");

    if (!email) return alert("Email is required!");

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Reset link sent to your email!");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        alert("No account found.");
      } else {
        alert(error.message);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 
    bg-gradient-to-b from-[#401F00] via-[#FF7A00] to-[#401F00]"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8"
      >
        {" "}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-0 top-4 flex items-center gap-2 
    text-white bg-black/20 px-3 py-1.5 rounded-md backdrop-blur-sm"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#2D1400]">
          Welcome back to Kridana
        </h2>
        <p className="text-center text-gray-500 mt-2">
          Login to continue to your profile
        </p>
        {/* Toggle Buttons */}
        <div className="flex mt-6 rounded-lg overflow-hidden border">
          <button className="flex-1 py-2 bg-[#FF6A00] text-white font-semibold">
            Login with Password
          </button>
          <button className="flex-1 py-2 bg-white text-[#2D1400] border-l">
            Login with OTP
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Email */}
          <div>
            <label className="text-[#FF6A00] font-medium text-sm">
              E-mail / Phone Number*
            </label>
            <input
              type="text"
              name="emailPhone"
              placeholder="abc123@gmail.com"
              required
              onChange={handleChange}
              className="w-full mt-1 p-3 border rounded-lg 
              focus:outline-none focus:border-[#FF6A00]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-[#FF6A00] font-medium text-sm">
              Password*
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              required
              onChange={handleChange}
              className="w-full mt-1 p-3 border rounded-lg 
              focus:outline-none focus:border-[#FF6A00]"
            />

            {/* Forgot Password */}
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#FF6A00] font-medium"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button className="w-full bg-[#FF6A00] text-white py-3 rounded-md font-bold">
            Login
          </button>
        </form>
        {/* Footer */}
        <p className="text-center text-[#2D1400] mt-6">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-[#FF6A00] font-bold cursor-pointer"
          >
            SignUp
          </span>
        </p>
      </motion.div>
    </div>
  );
}
