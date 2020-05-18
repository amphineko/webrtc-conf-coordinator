using System;
using System.Collections.Generic;
using Ikazuchi.Abstractions;
using Ikazuchi.Data;
using Microsoft.Extensions.DependencyInjection;

namespace Ikazuchi.Signaling
{
    [Component(ServiceLifetime.Singleton)]
    public class GatewaySessionManager
    {
        private readonly ApplicationDbContext _context;

        public GatewaySessionManager()
        {
            Sessions = new Dictionary<Guid, WeakReference<GatewaySession>>();
        }

        public IDictionary<Guid, WeakReference<GatewaySession>> Sessions { get; set; }

        public GatewaySession GetSession(Guid sessionId)
        {
            lock (Sessions)
            {
                if (Sessions.TryGetValue(sessionId, out var reference) && reference.TryGetTarget(out var session))
                    return session;

                session = new GatewaySession();
                Sessions[sessionId] = new WeakReference<GatewaySession>(session);
                return session;
            }
        }
    }
}