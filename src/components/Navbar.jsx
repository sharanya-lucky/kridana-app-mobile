import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { User, Home, Grid, PlusCircle, Video, Settings } from "lucide-react";

const serviceTypes = [
  { name: "Martial Arts", path: "/services/martial-arts" },
  { name: "Team Ball Sports", path: "/services/teamball" },
  { name: "Racket Sports", path: "/services/racketsports" },
  { name: "Fitness", path: "/services/fitness" },
  {
    name: "Target & Precision Sports",
    path: "/services/target-precision-sports",
  },
  { name: "Equestrian Sports", path: "/services/equestrian-sports" },
  {
    name: "Adventure & Outdoor Sports",
    path: "/services/adventure-outdoor-sports",
  },
  { name: "Ice Sports", path: "/services/ice-sports" },
  { name: "Aquatic Sports", path: "/services/aquatic" },
  { name: "Wellness", path: "/services/wellness" },
  { name: "Dance", path: "/services/dance" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  const navigate = useNavigate();
  const servicesRef = useRef(null);
  const userDropdownRef = useRef(null);
  const [profileImage, setProfileImage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [highlight, setHighlight] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHighlight(false);
    }, 4000); // highlight for 4 seconds on first visit

    return () => clearTimeout(timer);
  }, []);

  /* ================= FETCH USER ROLE & PLAN ================= */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        setUserRole(null);
        setHasActivePlan(false);
        setProfileImage("");
        setAuthLoading(false);
        return;
      }

      const trainerSnap = await getDoc(doc(db, "trainers", currentUser.uid));

      if (trainerSnap.exists()) {
        setUserRole("trainer");
        setProfileImage(trainerSnap.data().profileImageUrl || "");
      } else {
        const instituteSnap = await getDoc(
          doc(db, "institutes", currentUser.uid),
        );

        if (instituteSnap.exists()) {
          setUserRole("institute");
          setProfileImage(instituteSnap.data().profileImageUrl || "");
        } else {
          setUserRole("user");
          setProfileImage("");

          /* ✅ NEW: CHECK InstituteTrainers Login */
          const instituteTrainerSnap = await getDoc(
            doc(db, "InstituteTrainers", currentUser.uid),
          );

          if (instituteTrainerSnap.exists()) {
            setProfileImage(instituteTrainerSnap.data().profileImageUrl || "");
          }

          /* ✅ NEW: CHECK Students Login */
          const studentSnap = await getDoc(
            doc(db, "students", currentUser.uid),
          );

          if (studentSnap.exists()) {
            setProfileImage(studentSnap.data().profileImageUrl || "");
          }
        }
      }

      const planSnap = await getDoc(doc(db, "plans", currentUser.uid));
      if (
        planSnap.exists() &&
        planSnap.data()?.currentPlan?.status === "active"
      ) {
        setHasActivePlan(true);
      } else {
        setHasActivePlan(false);
      }

      // ✅ Auth finished loading
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* ================= USER DROPDOWN CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  /* ================= CLICK OUTSIDE HANDLER ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setServiceOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  /* ================= DASHBOARD NAVIGATION ================= */
  const handleDashboardNavigation = () => {
    setDropdownOpen(false);

    // ✅ Always open dashboard from top
    window.scrollTo(0, 0);

    if (userRole === "user") {
      navigate("/user/dashboard");
      return;
    }

    if (
      (userRole === "trainer" || userRole === "institute") &&
      !hasActivePlan
    ) {
      navigate("/plans");
      return;
    }

    if (userRole === "institute") {
      navigate("/institutes/dashboard");
      return;
    }

    if (userRole === "trainer") {
      navigate("/trainers/dashboard");
      return;
    }
  };

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await auth.signOut();

      setUserRole(null);
      setHasActivePlan(false);
      setDropdownOpen(false);
      setIsOpen(false);

      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  useEffect(() => {
    const setBottomGap = () => {
      if (window.innerWidth < 768) {
        document.body.style.paddingBottom = "90px"; // space for mobile navbar
      } else {
        document.body.style.paddingBottom = "0px";
      }
    };

    setBottomGap();
    window.addEventListener("resize", setBottomGap);

    return () => {
      window.removeEventListener("resize", setBottomGap);
      document.body.style.paddingBottom = "0px";
    };
  }, []);

  return (
    <>
      <nav className="hidden md:block w-full bg-black shadow-md sticky top-0 z-50">
        <div className="w-full px-6 md:px-10 lg:px-14">
          <div className="flex items-center justify-between h-16">
            {/* LOGO */}
            <div
              onClick={() => navigate("/")}
              className="flex items-center cursor-pointer"
            >
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden 
      bg-white flex items-center justify-center transition-all duration-500
      ${highlight ? "ring-4 ring-orange-400 animate-pulse scale-110" : ""}
      hover:scale-110 hover:ring-2 hover:ring-orange-400`}
              >
                <img
                  src="/Kridana logo.png"
                  alt="Kridana Logo"
                  className="w-full h-full object-contain p-1"
                />
              </div>
            </div>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center space-x-8 text-orange-500 font-normal text-lg">
              <NavLink to="/" className="hover:text-white transition">
                Home
              </NavLink>

              {/* SERVICES */}
              <div className="relative" ref={servicesRef}>
                <button
                  onClick={() => setServiceOpen((prev) => !prev)}
                  className="flex items-center gap-1 transition hover:text-white"
                >
                  Categories
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      serviceOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {serviceOpen && (
                  <div className="absolute top-10 left-0 w-60 bg-white shadow-md rounded-lg border border-gray-200 py-1 z-50">
                    {serviceTypes.map((service) => (
                      <NavLink
                        key={service.path}
                        to={service.path}
                        onClick={() => {
                          setIsOpen(false);
                          setServiceOpen(false); // ✅ IMPORTANT FIX
                        }}
                        className="block text-sm hover:text-orange-600"
                      >
                        {service.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              <NavLink
                to="/trending-plays"
                className="hover:text-white transition"
              >
                Reels
              </NavLink>

              {/* USER ACTIONS (profile + new dropdown side by side) */}
              {/* PROFILE + ARROW DROPDOWN */}
              {/* PROFILE + SMALL ARROW (tight like Categories) */}
              {auth.currentUser && (
                <div className="relative" ref={userDropdownRef}>
                  <div className="flex items-center">
                    {/* PROFILE ICON (no click) */}
                    {profileImage ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                    )}

                    {/* SMALL ARROW BUTTON */}
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="ml-1 p-1 hover:text-orange-600 transition"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-lg border border-gray-200 z-50 overflow-hidden">
                      <button
                        onClick={handleDashboardNavigation}
                        className="block w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-100 transition"
                      >
                        Dashboard
                      </button>

                      <div className="border-t border-gray-200"></div>

                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SIGN UP BUTTON */}
              {!authLoading && !auth.currentUser && (
                <button
                  onClick={() => navigate("/RoleSelection")}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full shadow-md transition"
                >
                  Sign Up
                </button>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white text-2xl z-50"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}

        {/* ✅ MOBILE BOTTOM NAVBAR */}
        {/* ✅ MOBILE BOTTOM NAVBAR */}
      </nav>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-orange-500 z-[9999] rounded-t-2xl shadow-lg">
       <div className="flex justify-around items-center py-3">
          <button
            onClick={() => navigate("/")}
            className="flex flex-col items-center text-gray-700"
          >
            <Home size={26} />
            <span className="text-xs">Home</span>
          </button>

          <button
            onClick={() => navigate("/MobileCategoriesPage")}
            className="flex flex-col items-center text-gray-700"
          >
            <Grid size={26} />
            <span className="text-xs">Categories</span>
          </button>

          <button
            onClick={() => navigate("/create")}
           className="bg-orange-500 text-white w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] flex items-center justify-center rounded-full shadow-lg relative -top-1"
          >
           <PlusCircle size={34} />
          </button>

          <button
            onClick={() => navigate("/trending-plays")}
            className="flex flex-col items-center text-gray-700"
          >
            <Video size={26} />
            <span className="text-xs">Reels</span>
          </button>

          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center text-gray-700"
          >
            <Settings size={26} />
            <span className="text-xs">Profile</span>
          </button>
        </div>
        {menuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-[9999]">
            {/* PANEL */}
            <div className="absolute bottom-0 w-full bg-white rounded-t-3xl p-5 animate-slideUp max-h-[90vh] overflow-y-auto">
              {/* HEADER */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Settings</h2>
                <button onClick={() => setMenuOpen(false)}>✖</button>
              </div>

              {/* ================= NOT LOGGED IN ================= */}
              {!auth.currentUser ? (
                <div className="text-center mt-6">
                  <p className="mb-4 text-gray-600">You are not logged in</p>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/RoleSelection");
                    }}
                    className="bg-orange-500 text-white px-6 py-2 rounded-full"
                  >
                    Sign Up / Login
                  </button>
                </div>
              ) : (
                <>
                  {/* ================= MENU ITEMS ================= */}
                  <div className="flex flex-col gap-2 text-gray-800">
                    <button onClick={() => navigate("/")} className="menu-item">
                      Home
                    </button>

                    <button
                      onClick={handleDashboardNavigation}
                      className="menu-item"
                    >
                      Dashboard
                    </button>

                    <button
                      onClick={() => navigate("/MobileCategoriesPage")}
                      className="menu-item"
                    >
                      Categories
                    </button>

                    <button
                      onClick={() => navigate("/MobileEditprofile")}
                      className="menu-item"
                    >
                      Edit Profile
                    </button>

                    <button
                      onClick={() => navigate("/Uploadimages")}
                      className="menu-item"
                    >
                      Upload images
                    </button>

                    <button
                      onClick={() => navigate("/terms")}
                      className="menu-item"
                    >
                      Terms & Conditions
                    </button>

                    <button
                      onClick={() => navigate("/privacy")}
                      className="menu-item"
                    >
                      Privacy Policy
                    </button>
                    <button
                      onClick={() => navigate("/help-center")}
                      className="menu-item"
                    >
                      Help Center
                    </button>
                    <button
                      onClick={() => navigate("/about")}
                      className="menu-item"
                    >
                      About
                    </button>
                    <button
                      onClick={handleLogout}
                      className="menu-item text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
