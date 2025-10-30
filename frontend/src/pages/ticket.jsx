import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Calendar, User, Tag, AlertTriangle, AlertCircle,
  Info, Clock, CheckCircle, Hash
} from "lucide-react";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!token) {
      console.warn("No token found. Redirecting to login.");
      navigate("/login");
      return;
    }

    let intervalId = null;
    let isMounted = true;

    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/tickets/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setTicket(data.ticket);

          // Stop polling once AI summary exists
          if (data.ticket?.summary && intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log("✅ Polling stopped: AI summary received.");
          }
        } else {
          console.error("❌ Failed to fetch ticket:", data.message);
          if (res.status === 401) navigate("/login");
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        if (!initialFetchDone.current) {
          initialFetchDone.current = true;
          setLoading(false);
        }
      }
    };

    fetchTicket();
    intervalId = setInterval(fetchTicket, 5000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, token, navigate]);

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
      <AlertTriangle className="w-5 h-5" />
    ) : p === "medium" ? (
      <AlertCircle className="w-5 h-5" />
    ) : (
      <Info className="w-5 h-5" />
    );

  const getStatusIcon = (s) => {
    switch (s?.toLowerCase()) {
      case "processing":
      case "open":
      case "todo":
        return <Clock className="w-5 h-5 text-warning" />;
      case "in progress":
        return <AlertCircle className="w-5 h-5 text-info" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      default:
        return <Clock className="w-5 h-5 text-base-content/50" />;
    }
  };

  const getProgressWidth = (s) =>
    s?.toLowerCase() === "processing"
      ? "33%"
      : s?.toLowerCase() === "in progress"
      ? "66%"
      : s?.toLowerCase() === "resolved" || s?.toLowerCase() === "closed"
      ? "100%"
      : "10%";

  const getProgressColor = (s) =>
    s?.toLowerCase() === "processing"
      ? "bg-gradient-to-r from-info to-primary/80"
      : s?.toLowerCase() === "in progress"
      ? "bg-gradient-to-r from-info to-info/80"
      : s?.toLowerCase() === "resolved" || s?.toLowerCase() === "closed"
      ? "bg-gradient-to-r from-success to-success/80"
      : "bg-gradient-to-r from-warning/50 to-warning/30";

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading ticket details...</p>
      </div>
    );

  if (!ticket)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p>❌ Ticket not found.</p>
        <Link to="/" className="btn btn-primary mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tickets
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <Link to="/" className="btn btn-ghost btn-sm fixed top-6 left-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <div className="max-w-6xl mx-auto mt-12">
        {/* Progress */}
        <div className="mb-6 bg-base-100 p-6 rounded-xl shadow">
          <div className="flex justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle /> Ticket Progress
            </h2>
            <div className="flex items-center gap-2">
              {getStatusIcon(ticket.status)}
              <span className="capitalize">{ticket.status}</span>
            </div>
          </div>
          <div className="w-full bg-base-300 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 ${getProgressColor(ticket.status)} transition-all`}
              style={{ width: getProgressWidth(ticket.status) }}
            ></div>
          </div>
        </div>

        {/* Details */}
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="bg-base-100 rounded-xl p-4 shadow">
            <h3 className="text-lg font-bold mb-3">Ticket Details</h3>
            <div className="space-y-3 text-sm">
              <div className="p-2 border rounded-md bg-base-200">
                <b>ID:</b> {ticket._id.slice(-8).toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {new Date(ticket.createdAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span
                  className={`badge ${getPriorityColor(ticket.priority)}`}
                >
                  {getPriorityIcon(ticket.priority)} {ticket.priority || "N/A"}
                </span>
              </div>
              {ticket.assignedTo && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  {ticket.assignedTo.email}
                </div>
              )}
            </div>
          </aside>

          {/* Main */}
          <main className="md:col-span-3 space-y-4">
            <div className="bg-base-100 p-6 rounded-xl shadow">
              <h1 className="text-3xl font-bold mb-3">{ticket.title}</h1>
              <p>{ticket.description}</p>
            </div>

            {!ticket.summary ? (
              <div className="bg-base-100 p-6 rounded-xl shadow text-info">
                <Clock className="w-5 h-5 inline mr-2 animate-spin" />
                AI analysis in progress...
              </div>
            ) : (
              <div className="bg-base-100 p-6 rounded-xl shadow">
                <h3 className="text-xl font-semibold mb-2 text-primary">
                  🤖 AI Summary
                </h3>
                <p>{ticket.summary}</p>

                {ticket.helpfulNotes && (
                  <div className="mt-4 border-t pt-3">
                    <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

