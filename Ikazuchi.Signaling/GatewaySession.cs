using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace Ikazuchi.Signaling
{
    public class GatewaySession
    {
        public GatewaySession()
        {
            Connections = new ConcurrentDictionary<Guid, string>();
        }

        public IDictionary<Guid, string> Connections { get; set; }

        public void Join(Guid userId, string connectionId, bool overrideCurrent)
        {
            lock (Connections)
            {
                if (Connections.TryGetValue(userId, out var currentConnection) && !overrideCurrent)
                    if (currentConnection == connectionId)
                        // connection already joined 
                        return;
                    else
                        // connection is stalled
                        throw new InvalidOperationException("User connected in another connection");

                Connections[userId] = connectionId;
            }
        }

        public void Remove(Guid userId)
        {
            lock (Connections)
            {
                Connections.Remove(userId);
            }
        }
    }
}