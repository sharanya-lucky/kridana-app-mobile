import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
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

const FeesDetailsPage = () => {
  const [instituteId, setInstituteId] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setInstituteId(user.uid);
    });

    return () => unsub();
  }, []);

  const currentYear = new Date().getFullYear();

  const [students, setStudents] = useState([]);
  const [institutesFees, setInstitutesFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedSport, setSelectedSport] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    totalFee: "",
    paidAmount: "",
    paidDate: "",
    feeWaived: false,
    waiveReason: "",
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

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "trainerstudents"),
      where("trainerId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      const studentsData = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setStudents(studentsData);
    });
  }, [instituteId]);

  /* ================= FETCH FEES ================= */
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "institutesFees"),
      where("trainerId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      setInstitutesFees(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );
    });
  }, [instituteId]);
  const categories = [
    ...new Set(
      students.flatMap((s) => (s.sports || []).map((sp) => sp.category)),
    ),
  ];
  const subCategories = [
    ...new Set(
      students
        .flatMap((s) => s.sports || [])
        .filter((sp) => !selectedCategory || sp.category === selectedCategory)
        .map((sp) => sp.subCategory),
    ),
  ];
  /* ================= FILTER LOGIC ================= */
  const filteredRows = useMemo(() => {
    let rows = [];

    [...students]
      .sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""))
      .filter((s) => Array.isArray(s.sports) && s.sports.length > 0) // only students with sports
      .forEach((student) => {
        const matchesSearch = `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase());

        if (!matchesSearch) return;

        student.sports.forEach((sport) => {
          if (selectedCategory && sport.category !== selectedCategory) return;
          if (selectedSubCategory && sport.subCategory !== selectedSubCategory)
            return;

          if (!selectedMonth || !selectedYear) {
            rows.push({ student, sport });
            return;
          }

          const selectedDate = new Date(
            Number(selectedYear),
            Number(selectedMonth) - 1,
            1,
          );

          if (student.joiningDate) {
            const joiningDate = new Date(student.joiningDate);
            if (
              selectedDate <
              new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1)
            ) {
              return;
            }
          }

          if (student.leftDate) {
            const leftDate =
              student.leftDate?.toDate?.() || new Date(student.leftDate);

            if (
              selectedDate >
              new Date(leftDate.getFullYear(), leftDate.getMonth(), 1)
            ) {
              return;
            }
          }

          rows.push({ student, sport });
        });
      });

    return rows;
  }, [
    students,
    search,
    selectedCategory,
    selectedSubCategory,
    selectedMonth,
    selectedYear,
  ]);
  useEffect(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear().toString();

    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);
  /* ================= EDIT STUDENT ================= */
  const handleEditStudent = (student, sport) => {
    setSelectedStudent(student);
    setSelectedSport(sport);

    const existingFee = institutesFees.find(
      (f) =>
        f.studentId === student.id &&
        f.category === sport.category &&
        f.subCategory === sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    setEditData({
      totalFee:
        existingFee?.totalAmount ?? student.monthlyFee ?? sport.fee ?? 0,

      paidAmount: existingFee?.paidAmount ?? "",
      paidDate: existingFee?.paidDate ?? "",
      feeWaived: existingFee?.feeWaived ?? false,
      waiveReason: existingFee?.waiveReason ?? "",
    });
    setShowEditModal(true);
  };
  const updateStudentPayment = async () => {
    if (!selectedStudent || !selectedSport) return;

    if (!selectedMonth) {
      alert("Please select month");
      return;
    }

    const { totalFee, paidAmount, paidDate, feeWaived, waiveReason } = editData;
    const finalTotal = feeWaived ? 0 : Number(totalFee);
    const finalPaid = feeWaived ? 0 : Number(paidAmount);
    try {
      /* update student monthly fee */
      await updateDoc(doc(db, "trainerstudents", selectedStudent.id), {
        monthlyFee: Number(totalFee),
      });

      const monthKey = `${selectedYear}-${selectedMonth}`;

      /* check existing fee record */
      const existingFee = institutesFees.find(
        (f) =>
          f.studentId === selectedStudent.id &&
          f.category === selectedSport.category &&
          f.subCategory === selectedSport.subCategory &&
          f.month === monthKey,
      );

      if (existingFee) {
        await updateDoc(doc(db, "institutesFees", existingFee.id), {
          totalAmount: finalTotal,
          paidAmount: finalPaid,
          paidDate: feeWaived ? "" : paidDate,
          feeWaived,
          waiveReason: feeWaived ? waiveReason : "",
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(collection(db, "institutesFees")), {
          studentId: selectedStudent.id,
          trainerId: instituteId,
          category: selectedSport.category,
          subCategory: selectedSport.subCategory,
          totalAmount: finalTotal,
          paidAmount: finalPaid,
          paidDate: feeWaived ? "" : paidDate,
          feeWaived,
          waiveReason: feeWaived ? waiveReason : "",
          month: monthKey,
          createdAt: serverTimestamp(),
        });
      }

      setShowEditModal(false);
      setSelectedStudent(null);
      setSelectedSport(null);
    } catch (err) {
      console.error(err);
      alert("Error saving payment");
    }
  };
  /* ================= CALCULATIONS ================= */
  const totalStudents = filteredRows.length;

  const totalAmount = filteredRows.reduce((sum, row) => {
    const record = institutesFees.find(
      (f) =>
        f.studentId === row.student.id &&
        f.category === row.sport.category &&
        f.subCategory === row.sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    return sum + Number(record?.totalAmount ?? row.sport.fee ?? 0);
  }, 0);

  const totalPaid = filteredRows.reduce((sum, row) => {
    const record = institutesFees.find(
      (f) =>
        f.studentId === row.student.id &&
        f.category === row.sport.category &&
        f.subCategory === row.sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    return sum + Number(record?.paidAmount || 0);
  }, 0);

  const totalPending = totalAmount - totalPaid;

  const getFeeData = (student, sport) => {
    const feeRecord = institutesFees.find(
      (f) =>
        f.studentId === student.id &&
        f.category === sport.category &&
        f.subCategory === sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    if (feeRecord?.feeWaived) {
      return {
        total: 0,
        paid: 0,
        pending: 0,
        paidDate: "-",
        reason: feeRecord.waiveReason || "Fee Waived",
      };
    }

    const total = Number(feeRecord?.totalAmount ?? sport.fee ?? 0);
    const paid = Number(feeRecord?.paidAmount || 0);
    const pending = total - paid;
    const paidDate = feeRecord?.paidDate || "-";

    return { total, paid, pending, paidDate, reason: "" };
  };
  return (
   <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] h-screen flex flex-col overflow-hidden max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* TITLE */}
        <h1 className="text-3xl font-bold text-gray-800">Fees Details</h1>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* YEAR FILTER */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          >
            {[
              currentYear - 2,
              currentYear - 1,
              currentYear,
              currentYear + 1,
            ].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* MONTH FILTER */}
          <div ref={monthRef} className="relative w-48">
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold w-full flex items-center justify-between hover:bg-orange-600 transition"
            >
              <span>
                {selectedMonth
                  ? MONTHS.find((m) => m.value === selectedMonth)?.label
                  : "Select Month"}
              </span>
              <ChevronDown size={18} />
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
                    className="px-4 py-2 hover:bg-orange-100 cursor-pointer"
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORY FILTER */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubCategory("");
            }}
            className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* SUBCATEGORY FILTER */}
          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          >
            <option value="">All SubCategories</option>
            {subCategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <StatCard title="Total Fees Amount" value={`₹ ${totalAmount}`} />
        <StatCard title="Total Fees Pending" value={`₹ ${totalPending}`} />
        <StatCard title="Total Fees Paid" value={`₹ ${totalPaid}`} />
        <StatCard title="Total Students" value={totalStudents} />
      </div>

      {/* TABLE */}
      {/* ================= TABLE ================= */}
     <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] h-screen flex flex-col overflow-hidden max-w-7xl mx-auto">
        {/* DESKTOP / LAPTOP VIEW */}
       <div className="hidden lg:block h-[45vh] overflow-y-auto overscroll-y-contain">
          {/* HEADER */}
          <div className="grid grid-cols-[2.2fr_2fr_1.6fr_1fr_1fr_1.2fr_1.2fr_1.3fr] bg-black text-orange-500 px-6 py-3 font-semibold text-sm">
            <div>Student</div>
            <div>Category</div>
            <div>SubCategory</div>
            <div className="text-center">Sessions</div>
            <div className="text-center">Total</div>
            <div className="text-center">Paid</div>
            <div className="text-center">Pending</div>
            <div className="text-center">Reason</div>
          </div>

          {/* ROWS */}
          {filteredRows.map((row, index) => {
            const { student, sport } = row;
            const data = getFeeData(student, sport);

            return (
              <div
                key={`${student.id}-${sport.category}-${sport.subCategory}`}
                onClick={() => handleEditStudent(student, sport)}
                className="grid grid-cols-[2.2fr_2fr_1.6fr_1fr_1fr_1.2fr_1.2fr_1.3fr] px-6 py-4 border-t items-center text-sm hover:bg-orange-50 cursor-pointer transition"
              >
            <div className="font-medium gap-1 text-gray-800 leading-7 pl-4 -indent-4 pr-4 text-left">
  {index + 1}. {student.firstName} {student.lastName}
</div>

                <div>{sport.category}</div>

                <div>{sport.subCategory}</div>

                <div className="text-center">
                  {sport.sessions || student.sessions || "-"}
                </div>

                <div className="text-center font-semibold">₹ {data.total}</div>

                <div className="text-center text-green-600 font-semibold">
                  ₹ {data.paid}
                  {data.paidDate !== "-" && (
                    <div className="text-xs text-gray-500">{data.paidDate}</div>
                  )}
                </div>

                <div className="text-center text-red-600 font-semibold">
                  ₹ {data.pending}
                </div>

                <div className="text-center">
                  {data.reason ? (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
                      {data.reason}
                    </span>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MOBILE / TABLET VIEW */}
       <div className="lg:hidden divide-y h-[45vh] overflow-y-auto overscroll-y-contain">
          {filteredRows.map((row, index) => {
            const { student, sport } = row;
            const data = getFeeData(student, sport);

            return (
              <div
                key={`${student.id}-${sport.category}-${sport.subCategory}`}
                onClick={() => handleEditStudent(student, sport)}
                className="p-4 hover:bg-orange-50 transition cursor-pointer"
              >
                {/* TOP */}
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-base">
                      {index + 1}. {student.firstName} {student.lastName}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {sport.category} • {sport.subCategory}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">Sessions</p>
                    <p className="font-medium text-gray-700">
                      {sport.sessions || student.sessions || "-"}
                    </p>
                  </div>
                </div>

                {/* FEES */}
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-semibold">₹ {data.total}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-semibold text-green-600">
                      ₹ {data.paid}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="font-semibold text-red-600">
                      ₹ {data.pending}
                    </p>
                  </div>
                </div>

                {/* DATE + REASON */}
                <div className="mt-3 flex flex-wrap gap-2 justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {data.paidDate !== "-"
                      ? `Paid: ${data.paidDate}`
                      : "Not Paid Yet"}
                  </div>

                  {data.reason && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
                      {data.reason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showEditModal && (
        <ModalForm
          title="Update Fee Details"
          data={editData}
          setData={setEditData}
          onSave={updateStudentPayment}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-black text-white rounded-xl p-3 sm:p-4 min-h-[110px] flex flex-col justify-between overflow-hidden">

    <h3 className="text-[11px] sm:text-sm md:text-base leading-5 font-medium break-words">
      {title}
    </h3>

    <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-500 break-words">
      {value}
    </p>

  </div>
);

const ModalForm = ({ title, data, setData, onSave, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <div className="bg-white p-6 rounded-xl w-96 space-y-4">
      <h2>{title}</h2>

      <input
        type="number"
        placeholder="Total Fee"
        value={data.totalFee}
        onChange={(e) => setData({ ...data, totalFee: e.target.value })}
        className="border w-full p-2 rounded"
      />

      <input
        type="number"
        placeholder="Paid Amount"
        value={data.paidAmount}
        onChange={(e) => setData({ ...data, paidAmount: e.target.value })}
        className="border w-full p-2 rounded"
      />
      {data.feeWaived && (
        <input
          type="text"
          placeholder="Reason (Medical Leave / Vacation)"
          value={data.waiveReason}
          onChange={(e) => setData({ ...data, waiveReason: e.target.value })}
          className="border w-full p-2 rounded"
        />
      )}
      <input
        type="date"
        value={data.paidDate}
        onChange={(e) => setData({ ...data, paidDate: e.target.value })}
        className="border w-full p-2 rounded"
      />
      <button
        onClick={() =>
          setData({
            ...data,
            feeWaived: true,
            totalFee: 0,
            paidAmount: 0,
            paidDate: "",
          })
        }
        className="bg-gray-200 px-3 py-1 rounded text-sm"
      >
        Fee Waived
      </button>
      <div className="flex justify-end gap-3">
        <button onClick={onClose}>Cancel</button>
        <button
          onClick={onSave}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default FeesDetailsPage;
