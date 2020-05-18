using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
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
        private readonly ApplicationDbContext _context;
        private readonly GatewaySessionManager _sessions;

        private readonly UserManager<ApplicationUser> _userManager;

        private GatewaySession _session;

        public GatewayController(
            GatewaySessionManager sessions,
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            _sessions = sessions;
            _context = context;
            _userManager = userManager;
        }

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

        public async Task LeaveCurrentSession()
        {
            var user = await _userManager.GetUserAsync(Context.User);

            (Session ?? throw new InvalidOperationException("Connection hasn't joined any session"))
                .Join(user.Id, Context.ConnectionId, false);

            await Task.WhenAll(Session.Connections.Values.Select(
                connectionId => Clients.Client(connectionId).OnParticipantLeave(user.Id)
            ));

            SetSession(null, Guid.Empty);
        }

        public async Task<SessionParticipantDescription> GetParticipant(Guid userId)
        {
            return new SessionParticipantDescription
            {
                ScreenName = (await _userManager.GetUserAsync(Context.User)).ScreenName
            };
        }

        public async Task JoinSession(Guid sessionId)
        {
            var user = await _userManager.GetUserAsync(Context.User);

            // session authorization
            var grant = await (
                    from g in _context.RtcSessionGrants
                    where g.Session.Id == sessionId && g.User.Id == user.Id
                    select g)
                .FirstOrDefaultAsync();
            if (grant == null)
                throw new InvalidOperationException("User is not authorized to join the session");

            SetSession(_sessions.GetSession(grant.Session.Id), grant.Session.Id);
            Session.Join(user.Id, Context.ConnectionId, true);

            await Task.WhenAll(Session.Connections.Select(pair =>
                pair.Key == user.Id
                    ? Task.CompletedTask
                    : Clients.Client(pair.Value).OnParticipantJoin(user.Id)
            ));
        }

        public async Task SendIceCandidate(Guid destination, string payload)
        {
            var user = await _userManager.GetUserAsync(Context.User);

            (Session ?? throw new InvalidOperationException("Connection hasn't joined any session"))
                .Join(user.Id, Context.ConnectionId, false);

            if (!Session.Connections.TryGetValue(destination, out var connectionId))
                throw new KeyNotFoundException("User not connected");

            await Clients.Client(connectionId).OnParticipantIceCandidate(await GetUserIdAsync(), payload);
        }

        public async Task SendSessionDescription(Guid destination, string payload)
        {
            var user = await _userManager.GetUserAsync(Context.User);

            (Session ?? throw new InvalidOperationException("Connection hasn't joined any session"))
                .Join(user.Id, Context.ConnectionId, false);

            if (!Session.Connections.TryGetValue(destination, out var connectionId))
                throw new KeyNotFoundException("User not connected");

            await Clients.Client(connectionId).OnParticipantSessionDescription(await GetUserIdAsync(), payload);
        }

        private void SetSession(GatewaySession session, Guid id)
        {
            _session = session;
            Context.Items["SessionId"] = id;
        }

        private async Task<Guid> GetUserIdAsync()
        {
            return (await _userManager.GetUserAsync(Context.User)).Id;
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }

    public interface IGatewayServer
    {
        Task<SessionParticipantDescription> GetParticipant(Guid userId);

        Task JoinSession(Guid sessionId);

        Task LeaveCurrentSession();

        Task SendIceCandidate(Guid destination, string payload);

        Task SendSessionDescription(Guid destination, string payload);
    }

    public interface IGatewayClient
    {
        Task OnParticipantLeave(Guid id);

        Task OnParticipantJoin(Guid id);

        Task OnParticipantIceCandidate(Guid origin, string payload);

        Task OnParticipantSessionDescription(Guid origin, string payload);
    }

    public class SessionParticipantDescription
    {
        [JsonPropertyName("screenName")] public string ScreenName { get; set; }
    }
}