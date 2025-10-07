import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, User, Tag, AlertTriangle, AlertCircle, Info, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setTicket(data.ticket);
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "text-error bg-error/10 border-error/20";
      case "medium": return "text-warning bg-warning/10 border-warning/20";
      case "low": return "text-info bg-info/10 border-info/20";
      default: return "text-base-content bg-base-200 border-base-300";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return <AlertTriangle className="w-5 h-5" />;
      case "medium": return <AlertCircle className="w-5 h-5" />;
      case "low": return <Info className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "open": return <Clock className="w-5 h-5 text-warning" />;
      case "in progress": return <AlertCircle className="w-5 h-5 text-info" />;
      case "resolved": return <CheckCircle className="w-5 h-5 text-success" />;
      case "closed": return <CheckCircle className="w-5 h-5 text-base-content/50" />;
      default: return <Clock className="w-5 h-5 text-base-content/50" />;
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );

  if (!ticket)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold mb-2">Ticket not found</h2>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link to="/" className="btn btn-ghost btn-sm mb-6 hover:bg-base-200">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tickets
      </Link>

      {/* Ticket Header */}
      <div className="card bg-base-100 shadow-xl border border-base-300 mb-6 animate-fade-in">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-primary mb-2">{ticket.title}</h1>
              <div className="flex items-center gap-4 text-sm text-base-content/70">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
                {ticket.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Assigned to {ticket.assignedTo.email}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {ticket.priority && (
                <div className={`badge badge-outline ${getPriorityColor(ticket.priority)} px-3 py-2`}>
                  <span className="flex items-center gap-1">
                    {getPriorityIcon(ticket.priority)}
                    {ticket.priority} Priority
                  </span>
                </div>
              )}
              {ticket.status && (
                <div className="badge badge-outline px-3 py-2">
                  <span className="flex items-center gap-1">
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-base-content/80 leading-relaxed">{ticket.description}</p>
          </div>

          {/* Summary */}
          {ticket.summary && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="text-lg font-semibold mb-2 text-primary">AI Summary</h3>
              <p className="text-base-content/80">{ticket.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Details */}
      {(ticket.relatedSkills?.length > 0 || ticket.helpfulNotes) && (
        <div className="card bg-base-100 shadow-xl border border-base-300 animate-slide-up">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              <Tag className="w-5 h-5" />
              Additional Information
            </h2>

            {ticket.relatedSkills?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Related Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {ticket.relatedSkills.map((skill, index) => (
                    <span key={index} className="badge badge-primary badge-outline">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ticket.helpfulNotes && (
              <div>
                <h3 className="font-semibold mb-2">Helpful Notes</h3>
                <div className="prose prose-sm max-w-none bg-base-200 p-4 rounded-lg border">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
