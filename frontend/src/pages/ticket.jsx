import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, User, Tag, AlertTriangle, AlertCircle, Info, Clock, CheckCircle, Hash } from "lucide-react";
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

  const getProgressWidth = (status) => {
    switch (status?.toLowerCase()) {
      case "open": return "33%";
      case "in progress": return "66%";
      case "resolved": return "100%";
      case "closed": return "100%";
      default: return "0%";
    }
  };

  const getProgressColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open": return "bg-gradient-to-r from-warning to-warning/80";
      case "in progress": return "bg-gradient-to-r from-info to-info/80";
      case "resolved": return "bg-gradient-to-r from-success to-success/80";
      case "closed": return "bg-gradient-to-r from-base-content/50 to-base-content/30";
      default: return "bg-base-300";
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-base-content/70">Loading ticket details...</p>
        </div>
      </div>
    );

  if (!ticket)
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-100 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6 animate-bounce">🎫</div>
          <h2 className="text-3xl font-bold mb-4 text-primary">Ticket not found</h2>
          <p className="text-base-content/70 mb-6">The ticket you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-shadow">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Tickets
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-primary/5">
      {/* Floating Back Button */}
      <Link to="/" className="btn btn-ghost btn-sm fixed top-6 left-6 z-20 hover:bg-base-200 shadow-lg backdrop-blur-sm bg-base-100/80">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tickets
      </Link>

      <div className="max-w-7xl mx-auto p-6 pt-20">
        {/* Status Progress Indicator */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-base-100 rounded-2xl shadow-xl border border-base-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Ticket Progress
              </h2>
              <div className="flex items-center gap-2">
                {getStatusIcon(ticket.status)}
                <span className="font-semibold capitalize text-lg">{ticket.status}</span>
              </div>
            </div>
            <div className="w-full bg-base-300 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className={`h-4 rounded-full transition-all duration-1000 ease-out ${getProgressColor(ticket.status)} shadow-sm`}
                style={{ width: getProgressWidth(ticket.status) }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-base-content/60 mt-3 px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Open
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                In Progress
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Resolved
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-2xl border border-base-300 animate-slide-in-left">
              <div className="card-body">
                <h3 className="card-title text-xl mb-6 flex items-center gap-2">
                  <Tag className="w-6 h-6 text-primary" />
                  Ticket Details
                </h3>
                <div className="space-y-5">
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <label className="text-sm font-semibold text-primary uppercase tracking-wide">Ticket ID</label>
                    <p className="font-mono text-lg font-bold text-primary mt-1 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      {ticket._id.slice(-8).toUpperCase()}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-base-content/70 mb-2 block">Status</label>
                    <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                      {getStatusIcon(ticket.status)}
                      <span className="font-semibold capitalize">{ticket.status}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-base-content/70 mb-2 block">Priority</label>
                    <div className={`badge ${getPriorityColor(ticket.priority)} px-4 py-2 text-sm font-semibold shadow-sm`}>
                      <span className="flex items-center gap-2">
                        {getPriorityIcon(ticket.priority)}
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-base-content/70 mb-2 block">Created</label>
                    <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm text-base-content/60">{new Date(ticket.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>

                  {ticket.assignedTo && (
                    <div>
                      <label className="text-sm font-medium text-base-content/70 mb-2 block">Assigned To</label>
                      <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                        <User className="w-5 h-5 text-primary" />
                        <span className="font-medium">{ticket.assignedTo.email}</span>
                      </div>
                    </div>
                  )}

                  {ticket.relatedSkills?.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-base-content/70 mb-2 block">Related Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {ticket.relatedSkills.map((skill, index) => (
                          <span key={index} className="badge badge-primary badge-outline px-3 py-1 shadow-sm hover:shadow-md transition-shadow">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Title and Description */}
            <div className="card bg-base-100 shadow-2xl border border-base-300 animate-slide-in-right">
              <div className="card-body">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-focus bg-clip-text text-transparent mb-4 leading-tight">
                  {ticket.title}
                </h1>
                <div className="prose prose-lg max-w-none">
                  <h3 className="text-xl font-semibold mb-3 text-base-content flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Description
                  </h3>
                  <div className="bg-base-200 p-6 rounded-xl border-l-4 border-primary shadow-inner">
                    <p className="text-base-content/90 leading-relaxed text-lg m-0">{ticket.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary as Chat Bubble */}
            {ticket.summary && (
              <div className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-start gap-4">
                  <div className="avatar placeholder flex-shrink-0">
                    <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                      <span className="text-xl">🤖</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="chat chat-start">
                      <div className="chat-bubble chat-bubble-primary max-w-none shadow-xl border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-bold text-primary-content text-lg">AI Assistant</span>
                          <span className="text-xs opacity-90 bg-primary-content/20 px-2 py-1 rounded-full">Just analyzed</span>
                        </div>
                        <p className="text-primary-content text-lg leading-relaxed m-0">{ticket.summary}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Helpful Notes */}
            {ticket.helpfulNotes && (
              <div className="card bg-base-100 shadow-2xl border border-base-300 animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
                <div className="card-body">
                  <h3 className="card-title text-2xl mb-6 flex items-center gap-3">
                    <div className="p-2 bg-info/10 rounded-lg">
                      <Info className="w-6 h-6 text-info" />
                    </div>
                    Helpful Notes
                  </h3>
                  <div className="prose prose-lg max-w-none bg-gradient-to-r from-info/5 to-info/10 p-6 rounded-xl border border-info/20 shadow-inner">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold text-info mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold text-info mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium text-info mb-2">{children}</h3>,
                        p: ({ children }) => <p className="text-base-content/90 leading-relaxed mb-3">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-3">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-3">{children}</ol>,
                        li: ({ children }) => <li className="text-base-content/90">{children}</li>,
                        code: ({ children }) => <code className="bg-base-100 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                        pre: ({ children }) => <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto border">{children}</pre>,
                      }}
                    >
                      {ticket.helpfulNotes}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
