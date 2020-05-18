using System;

namespace Ikazuchi.Web.Areas.RtcSessions.Models
{
    public class InviteCreateForm
    {
        public uint Expires { get; set; } = 60;

        public Guid SessionId { get; set; }
    }
}