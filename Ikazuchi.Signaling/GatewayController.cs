using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using IdentityServer4.Models;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Signaling
{
    [Authorize]
    public class GatewayController : Hub<IGatewayClient>, IGatewayServer
    {
        private readonly GatewaySessionManager _sessions;
        private readonly ApplicationDbContext _context;

        private readonly UserManager<ApplicationUser> _userManager;

        private GatewaySession _session;

        public GatewaySession Session
        {
            get
            {
                if (_session != null)
                    return _session;

                if (!Context.Items.TryGetValue("SessionId", out var sessionId) || (Guid) sessionId == Guid.Empty)
                    return null;

                _session = _sessions.GetSession((Guid) sessionId);
                return _session;
            }
        }

        private void SetSession(GatewaySession session, Guid id)
        {
            _session = session;
            Context.Items["SessionId"] = id;
        }

        public GatewayController(
            GatewaySessionManager sessions,
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            _sessions = sessions;
            _context = context;
            _userManager = userManager;
        }

        public async Task LeaveCurrentSession()
        {
            if (!await EnsureConnectionSingleton()) return;

            if (Session == null)
                throw new InvalidOperationException("Connection hasn't joined any session");

            var userId = await GetUserIdAsync();
            Session.Connections.Remove(userId);
            await Task
                .WhenAll(Session.Connections.Values
                    .Select(connectionId => Clients.Client(connectionId).OnParticipantLeave(userId)));

            SetSession(null, Guid.Empty);
        }

        private async Task<Guid> GetUserIdAsync()
        {
            return (await _userManager.GetUserAsync(Context.User)).Id;
        }

        public async Task JoinSession(Guid sessionId)
        {
            // connection authorization
            var user = await _userManager.GetUserAsync(Context.User);
            if (user == null)
                throw new InvalidOperationException("Connection is not authorized");

            if (!await EnsureConnectionSingleton()) return;

            // session authorization
            var grant = await (
                    from g in _context.RtcSessionGrants
                    where g.Session.Id == sessionId && g.User.Id == user.Id
                    select g)
                .FirstOrDefaultAsync();
            if (grant == null)
                throw new InvalidOperationException("User is not authorized to join the session");

            SetSession(_sessions.GetSession(grant.Session.Id), grant.Session.Id);
            Session.Connections[user.Id] = Context.ConnectionId;

            var info = new SessionParticipantDescription()
            {
                ScreenName = (await _userManager.GetUserAsync(Context.User)).ScreenName
            };
            await Task.WhenAll(Session.Connections.Select(pair =>
                pair.Key == user.Id
                    ? Task.CompletedTask
                    : Clients.Client(pair.Value).OnParticipantJoin(user.Id, info)
            ));
        }

        public async Task SendIceCandidate(Guid destination, string payload)
        {
            if (!await EnsureConnectionSingleton()) return;

            if (!Session.Connections.TryGetValue(destination, out var connectionId))
                throw new KeyNotFoundException("User not connected");

            await Clients.Client(connectionId).OnParticipantIceCandidate(await GetUserIdAsync(), payload);
        }

        public async Task SendRtcAnswer(Guid destination, string payload)
        {
            if (!await EnsureConnectionSingleton()) return;

            if (!Session.Connections.TryGetValue(destination, out var connectionId))
                throw new KeyNotFoundException("User not connected");

            await Clients.Client(connectionId).OnParticipantRtcAnswer(await GetUserIdAsync(), payload);
        }

        public async Task SendRtcOffer(Guid destination, string payload)
        {
            if (!await EnsureConnectionSingleton()) return;

            if (!Session.Connections.TryGetValue(destination, out var connectionId))
                throw new KeyNotFoundException("User not connected");

            await Clients.Client(connectionId).OnParticipantRtcOffer(await GetUserIdAsync(), payload,
                new SessionParticipantDescription()
                {
                    ScreenName = (await _userManager.GetUserAsync(Context.User)).ScreenName
                });
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = await GetUserIdAsync();

            if (Session != null &&
                Session.Connections.TryGetValue(userId, out var connectionId) &&
                connectionId == Context.ConnectionId)
                Session?.Connections.Remove(userId);

            await base.OnDisconnectedAsync(exception);
        }

        private async Task<bool> EnsureConnectionSingleton()
        {
            if (Session == null || Session.Connections[await GetUserIdAsync()] == Context.ConnectionId)
                return true;

            Context.Abort();
            return false;
        }
    }

    public interface IGatewayServer
    {
        Task LeaveCurrentSession();

        Task JoinSession(Guid sessionId);

        Task SendIceCandidate(Guid destination, string payload);

        Task SendRtcAnswer(Guid destination, string payload);

        Task SendRtcOffer(Guid destination, string payload);
    }

    public interface IGatewayClient
    {
        Task OnParticipantLeave(Guid id);

        Task OnParticipantJoin(Guid id, SessionParticipantDescription description);

        Task OnParticipantIceCandidate(Guid origin, string payload);

        Task OnParticipantRtcAnswer(Guid origin, string sdpAnswer);

        Task OnParticipantRtcOffer(Guid origin, string sdpOffer, SessionParticipantDescription description);
    }

    public class SessionParticipantDescription
    {
        [JsonPropertyName("screenName")] public string ScreenName { get; set; }
    }
}