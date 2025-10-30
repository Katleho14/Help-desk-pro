import { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TicketsContext } from "../contexts/TicketsContext.jsx";
import {
  Plus, Filter, Calendar, AlertTriangle, AlertCircle, Info, Eye
} from "lucide-react";

export default function Tickets() {
  const {
    tickets,
    page,
    pages,
    loading,
    setPage,
    fetchTickets,
    priority,
    setPriority,
  } = useContext(TicketsContext);

  const [form, setForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      console.warn("No token found. Redirecting to login.");
      navigate("/login");
      return;
    }
    fetchTickets(page, priority);
  }, [fetchTickets, page, priority, token, navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!token) {
      alert("You must log in to create a ticket.");
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setForm({ title: "", description: "" });
        setPage(1);
        fetchTickets(1, priority);
      } else if (res.status === 401) {
        navigate("/login");
      } else {
        alert(data.message || "Ticket creation failed");
      }
    } catch (err) {
      console.error("❌ Error creating ticket:", err);
      alert("Error creating ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (p) =>
    p === "high"
      ? "text-error bg-error/10 border-error/20"
      : p === "medium"
      ? "text-warning bg-warning/10 border-warning/20"
      : p === "low"
      ? "text-info bg-info/10 border-info/20"
      : "text-base-content bg-base-200 border-base-300";

  const getPriorityIcon = (p) =>
    p === "high" ? (
      <AlertTriangle className="w-4 h-4" />
    ) : p === "medium" ? (
      <AlertCircle className="w-4 h-4" />
    ) : (
      <Info className="w-4 h-4" />
    );

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🎟️ Support Tickets</h1>

      {/* Create Ticket */}
      <form
        onSubmit={handleSubmit}
        className="card bg-base-100 shadow-lg border border-base-300 mb-8 p-6"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Create New Ticket
        </h2>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Title"
          className="input input-bordered w-full mb-3"
          required
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
          className="textarea textarea-bordered w-full mb-4"
          rows="4"
          required
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Create Ticket"}
        </button>
      </form>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-5 h-5" />
        <select
          className="select select-bordered select-sm"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner text-primary"></span>
        </div>
      ) : tickets?.length ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Link
              key={ticket._id}
              to={`/tickets/${ticket._id}`}
              className="card bg-base-100 p-5 border border-base-300 shadow-md hover:shadow-lg transition"
            >
              <h3 className="font-bold text-lg mb-2">{ticket.title}</h3>
              <p className="text-sm mb-3 text-base-content/80 line-clamp-2">
                {ticket.description}
              </p>
              <div className="flex justify-between text-sm text-base-content/60">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
                <div className={`badge ${getPriorityColor(ticket.priority)}`}>
                  {getPriorityIcon(ticket.priority)} {ticket.priority}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">No tickets found.</p>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

