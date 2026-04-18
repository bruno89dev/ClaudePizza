import * as signalR from "@microsoft/signalr";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

let connection: signalR.HubConnection | null = null;

export function getOrderHubConnection(): signalR.HubConnection {
  if (!connection) {
    const token = localStorage.getItem("token") ?? "";
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/orders`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();
  }
  return connection;
}

export async function startOrderHub(): Promise<signalR.HubConnection> {
  const hub = getOrderHubConnection();
  if (hub.state === signalR.HubConnectionState.Disconnected) {
    await hub.start();
  }
  return hub;
}
