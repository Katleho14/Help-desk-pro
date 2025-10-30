import { createContext, useState, useCallback } from "react";

export const TicketsContext = createContext();

export function TicketsProvider({ children }) {
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState("");
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");
  const limit = 5;

  const fetchTickets = useCallback(
    async (pageToLoad = page, prio = priority) => {
      if (!token) {
        console.warn("⚠️ No token found — user might not be logged in.");
        setError("You must be logged in to view tickets.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: pageToLoad,
          limit,
          ...(prio ? { priority: prio } : {}),
        });

        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/tickets?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          console.error("❌ Ticket fetch failed:", data);
          if (res.status === 401) {
            setError("Your session has expired. Please log in again.");
            localStorage.removeItem("token");
          } else {
            setError(data.message || "Failed to fetch tickets.");
          }
          return;
        }

        // ✅ Successfully fetched
        setTickets(data.tickets || []);
        setPages(data.pages || 1);
        setPage(data.page || 1);
      } catch (err) {
        console.error("🚨 Network error fetching tickets:", err);
        setError("Network error fetching tickets.");
      } finally {
        setLoading(false);
      }
    },
    [page, token, priority]
  );

  return (
    <TicketsContext.Provider
      value={{
        tickets,
        page,
        pages,
        loading,
        error,
        setPage,
        fetchTickets,
        priority,
        setPriority,
      }}
    >
      {children}
    </TicketsContext.Provider>
  );
}
