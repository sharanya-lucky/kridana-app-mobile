import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown } from "lucide-react";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const SalaryDetailsPage = () => {
  const { user } = useAuth();

  const [trainers, setTrainers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editData, setEditData] = useState({
    monthlySalary: "",
    paidAmount: "",
    paidDate: "",
  });

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= FETCH TRAINERS ================= */
  useEffect(() => {
    if (!user) return;

    const fetchTrainers = async () => {
      const q = query(
        collection(db, "InstituteTrainers"),
        where("instituteId", "==", user.uid),
      );
      const snap = await getDocs(q);
      setTrainers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchTrainers();
  }, [user]);

  /* ================= FETCH SALARIES ================= */
  useEffect(() => {
    if (!user) return;

    const fetchSalaries = async () => {
      const q = query(
        collection(db, "instituteSalaries"),
        where("instituteId", "==", user.uid), // ✅ ONLY THIS INSTITUTE
      );

      const snap = await getDocs(q);
      setSalaries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchSalaries();
  }, [user]);

  /* ================= FILTER ================= */
  const filteredTrainers = useMemo(() => {
    return trainers
      .filter((t) =>
        `${t.firstName} ${t.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
  }, [trainers, search]);

  /* ================= EDIT SALARY ================= */
  const handleEdit = () => {
    if (!selectedTrainer) {
      alert("Select trainer first");
      return;
    }
    if (!selectedMonth) {
      alert("Please select a month first!");
      return;
    }

    const salaryRecord = salaries.find(
      (s) => s.trainerId === selectedTrainer.id && s.month === selectedMonth,
    );

    setEditData({
      monthlySalary: selectedTrainer.monthlySalary || "",
      paidAmount: salaryRecord?.paidAmount || "",
      paidDate: salaryRecord?.paidDate || "",
    });

    setShowEditModal(true);
  };

  const saveSalary = async () => {
    if (!selectedTrainer) {
      alert("Select trainer first");
      return;
    }

    if (!selectedMonth) {
      alert("Please select a month first!");
      return;
    }

    if (!editData.monthlySalary || isNaN(editData.monthlySalary)) {
      alert("Enter valid Monthly Salary");
      return;
    }

    if (!editData.paidAmount || isNaN(editData.paidAmount)) {
      alert("Enter valid Paid Amount");
      return;
    }

    if (!editData.paidDate) {
      alert("Select paid date");
      return;
    }

    try {
      const { monthlySalary, paidAmount, paidDate } = editData;

      // Update trainer monthly salary
      await setDoc(
        doc(db, "InstituteTrainers", selectedTrainer.id),
        { monthlySalary: parseInt(monthlySalary || 0) },
        { merge: true },
      );

      // Save salary month-wise
      // check if salary already exists for trainer + month
      const existingSalary = salaries.find(
        (s) => s.trainerId === selectedTrainer.id && s.month === selectedMonth,
      );

      if (existingSalary) {
        // UPDATE existing salary
        await setDoc(
          doc(db, "instituteSalaries", existingSalary.id),
          {
            totalAmount: Number(monthlySalary),
            paidAmount: Number(paidAmount),
            paidDate,
            month: selectedMonth,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        // CREATE new salary
        await setDoc(doc(collection(db, "instituteSalaries")), {
          trainerId: selectedTrainer.id,
          instituteId: user.uid,
          totalAmount: Number(monthlySalary),
          paidAmount: parseInt(paidAmount || 0),
          paidDate,
          month: selectedMonth,
          createdAt: serverTimestamp(),
        });
      }

      alert("Salary saved successfully ✅");
      // refresh trainers after updating salary
      const trainerSnap = await getDocs(
        query(
          collection(db, "InstituteTrainers"),
          where("instituteId", "==", user.uid),
        ),
      );

      setTrainers(trainerSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // refresh salaries from firestore
      const snap = await getDocs(collection(db, "instituteSalaries"));
      setSalaries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSelectedTrainer(null);
      setEditData({
        monthlySalary: "",
        paidAmount: "",
        paidDate: "",
      });
      setShowEditModal(false);
    } catch (error) {
      console.error("Error saving salary:", error);
      alert("Error saving salary ❌");
    }
  };

  /* ================= GET SALARY DATA ================= */
  const getTrainerSalaryData = (trainer) => {
    const salaryRecord = salaries.find(
      (s) => s.trainerId === trainer.id && s.month === selectedMonth,
    );

    return {
      paid: salaryRecord?.paidAmount || 0,
      date: salaryRecord?.paidDate || "-",
    };
  };

  const totalTrainers = trainers.length;
  // ✅ TOTAL SALARY → FROM TRAINERS (NOT salaries)
  // ✅ TOTAL SALARY (ONLY FOR SELECTED MONTH)
  const totalSalaryAmount = selectedMonth
    ? trainers.reduce((sum, t) => sum + parseInt(t.monthlySalary || 0), 0)
    : 0;

  // ✅ FILTER CURRENT MONTH SALARIES
  const monthSalaries = selectedMonth
    ? salaries.filter((s) => s.month === selectedMonth)
    : [];

  // ✅ TOTAL PAID
  const totalSalaryPaid = monthSalaries.reduce(
    (sum, s) => sum + parseInt(s.paidAmount || 0),
    0,
  );

  // ✅ TOTAL PENDING (SAFE)
  const totalSalaryPending = Math.max(totalSalaryAmount - totalSalaryPaid, 0);
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Salary Details</h1>
        <div ref={monthRef} className="relative w-full sm:w-48">
          <button
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="bg-orange-500 text-white rounded-lg px-4 py-3 font-semibold w-full flex items-center justify-between"
          >
            <span>
              {selectedMonth
                ? MONTHS.find((m) => m.value === selectedMonth)?.label
                : "Select Month"}
            </span>
            <ChevronDown
              size={18}
              className={`ml-2 transition-transform ${
                showMonthDropdown ? "rotate-180" : ""
              }`}
            />
          </button>
          {showMonthDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
              {MONTHS.map((m) => (
                <div
                  key={m.value}
                  onClick={() => {
                    setSelectedMonth(m.value);
                    setShowMonthDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                >
                  {m.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Employees" value={totalTrainers} />
        <StatCard
          title="Total Salary Amount"
          value={`₹ ${totalSalaryAmount}`}
        />
        <StatCard
          title="Total Salary Pending"
          value={`₹ ${totalSalaryPending}`}
        />
        <StatCard title="Total Salary Paid" value={`₹ ${totalSalaryPaid}`} />
      </div>

      {/* SEARCH + EDIT */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="relative w-full sm:w-80 mb-4">
          {/* Search Icon */}
          <img
            src="/search-icon.png"
            alt="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60"
          />

          {/* Input */}
          <input
            type="text"
            placeholder="Search here..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-orange-400 rounded px-10 py-2 w-full 
               focus:outline-none focus:ring-0 focus:border-orange-400"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            onClick={handleEdit}
            className="border border-orange-500 text-orange-500 px-4 py-2 rounded"
          >
            Edit
          </button>
        </div>
      </div>

      {/* TABLE */}
      {/* TABLE / MOBILE VIEW */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden md:block">
          {/* HEADER */}
          <div className="grid grid-cols-5 bg-black text-orange-500 px-6 py-4 font-semibold text-sm">
            <div>Employee Names</div>
            <div>Designation</div>
            <div>Monthly Salary</div>
            <div>Paid</div>
            <div>Date</div>
          </div>

          {/* ROWS */}
          {filteredTrainers.map((trainer, index) => {
            const salaryData = getTrainerSalaryData(trainer);

            return (
              <div
                key={trainer.id}
                onClick={() => setSelectedTrainer(trainer)}
                className={`grid grid-cols-5 px-6 py-4 border-t items-center text-sm cursor-pointer hover:bg-gray-50 transition ${
                  selectedTrainer?.id === trainer.id ? "bg-orange-50" : ""
                }`}
              >
                <div className="font-medium text-gray-800">
                  {index + 1}. {trainer.firstName} {trainer.lastName}
                </div>

                <div>{trainer.designation || "-"}</div>

                <div className="font-semibold">
                  ₹ {trainer.monthlySalary || 0}
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrainer(trainer);

                    if (!selectedMonth) {
                      alert("Please select a month first!");
                      return;
                    }

                    const salaryRecord = salaries.find(
                      (s) =>
                        s.trainerId === trainer.id && s.month === selectedMonth,
                    );

                    setEditData({
                      monthlySalary: trainer.monthlySalary || "",
                      paidAmount: salaryRecord?.paidAmount || "",
                      paidDate: salaryRecord?.paidDate || "",
                    });

                    setShowEditModal(true);
                  }}
                  className="text-green-600 font-semibold cursor-pointer hover:underline"
                >
                  ₹ {salaryData.paid}
                </div>

                <div>{salaryData.date}</div>
              </div>
            );
          })}
        </div>

        {/* ================= MOBILE CARD VIEW ================= */}
        <div className="md:hidden divide-y">
          {filteredTrainers.map((trainer, index) => {
            const salaryData = getTrainerSalaryData(trainer);

            return (
              <div
                key={trainer.id}
                onClick={() => setSelectedTrainer(trainer)}
                className={`p-4 space-y-3 cursor-pointer transition ${
                  selectedTrainer?.id === trainer.id
                    ? "bg-orange-50"
                    : "bg-white"
                }`}
              >
                {/* TOP */}
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {index + 1}. {trainer.firstName} {trainer.lastName}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      {trainer.designation || "No Designation"}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrainer(trainer);

                      if (!selectedMonth) {
                        alert("Please select a month first!");
                        return;
                      }

                      const salaryRecord = salaries.find(
                        (s) =>
                          s.trainerId === trainer.id &&
                          s.month === selectedMonth,
                      );

                      setEditData({
                        monthlySalary: trainer.monthlySalary || "",
                        paidAmount: salaryRecord?.paidAmount || "",
                        paidDate: salaryRecord?.paidDate || "",
                      });

                      setShowEditModal(true);
                    }}
                    className="text-xs px-3 py-1 rounded-lg border border-orange-400 text-orange-500 font-medium"
                  >
                    Edit
                  </button>
                </div>

                {/* DETAILS */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Monthly Salary</p>
                    <p className="font-semibold text-gray-800">
                      ₹ {trainer.monthlySalary || 0}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-semibold text-green-600">
                      ₹ {salaryData.paid}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-gray-500">Paid Date</p>
                    <p className="font-semibold text-gray-800">
                      {salaryData.date}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAVE & CANCEL */}
      <div className="flex flex-col sm:flex-row justify-end gap-6 mt-8">
        <button
          onClick={() => {
            setSearch("");
            setSelectedMonth("");
            setSelectedTrainer(null);
          }}
          className="text-lg font-medium"
        >
          Cancel
        </button>
        <button
          onClick={saveSalary}
          className="bg-orange-500 text-white px-8 py-3 rounded-lg text-lg font-semibold w-full sm:w-auto"
        >
          Save
        </button>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <ModalForm
          title="Edit Salary"
          data={editData}
          setData={setEditData}
          onSave={saveSalary}
          onClose={() => setShowEditModal(false)}
          showPaidFields={true}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-black text-white p-4 rounded-lg">
    <h3 className="text-sm">{title}</h3>
    <p className="text-xl font-bold text-orange-500 mt-2">{value}</p>
  </div>
);

const ModalForm = ({
  title,
  data,
  setData,
  onSave,
  onClose,
  showPaidFields,
}) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-[90%] sm:w-96 space-y-4">
      <h2 className="font-semibold">{title}</h2>

      <input
        type="text"
        inputMode="numeric"
        className="border w-full p-2 rounded"
        placeholder="Monthly Salary"
        value={data.monthlySalary}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9]/g, "");
          setData({ ...data, monthlySalary: value });
        }}
      />

      {showPaidFields && (
        <>
          {/* ✅ PAID AMOUNT */}
          <input
            type="text"
            inputMode="numeric"
            className="border w-full p-2 rounded"
            placeholder="Paid Amount"
            value={data.paidAmount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              setData({ ...data, paidAmount: value });
            }}
          />

          {/* ✅ PAID DATE */}
          <input
            type="date"
            className="border w-full p-2 rounded"
            value={data.paidDate}
            onChange={(e) => setData({ ...data, paidDate: e.target.value })}
          />
        </>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default SalaryDetailsPage;
