import React from "react";
import {useNavigate} from "react-router-dom";
import {ArrowLeft,SlidersHorizontal} from "lucide-react";

export default function TrainerPaymentsDetails({
setView,
payment
}){

const navigate=useNavigate();


return(
<div className="min-h-screen bg-[#FFF4ED] p-4">

<div className="flex justify-between items-center mb-6">
<div className="flex items-center gap-3">
<button onClick={()=>setView("Dashboard")}>
<ArrowLeft/>
</button>

<h1 className="text-2xl font-bold text-[#FF6A00]">
Pending Fees
</h1>
</div>

<div className="bg-white p-2 rounded-lg shadow">
<SlidersHorizontal/>
</div>
</div>

<p className="mb-6 text-lg">
Branch: 10
</p>

<div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">

<div className="flex items-center gap-4">

<div className="w-14 h-14 bg-[#2d2d2d] rounded-lg flex items-center justify-center text-orange-500 font-bold text-xl">
{payment?.studentName?.charAt(0) || "G"}
</div>

<div>
<h2 className="font-semibold text-lg">
{payment?.studentName || "Student"}
</h2>

<p className="text-gray-600">
Paid: ₹{payment?.paidAmount} / ₹{payment?.totalAmount}
</p>

<p className="text-gray-400">
Date: 4/21/2026
</p>
</div>

</div>

<div className="text-green-600 font-semibold">
Paid
</div>

</div>

</div>
)
}