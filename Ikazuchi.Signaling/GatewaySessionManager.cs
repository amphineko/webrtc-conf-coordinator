using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using Ikazuchi.Abstractions;
using Ikazuchi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ikazuchi.Signaling
{
    [Component(ServiceLifetime.Singleton)]
    public class GatewaySessionManager
    {
        private readonly ApplicationDbContext _context;

        public IDictionary<Guid, WeakReference<GatewaySession>> Sessions { get; set; }

        public GatewaySessionManager()
        {
            Sessions = new Dictionary<Guid, WeakReference<GatewaySession>>();
        }

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