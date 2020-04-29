using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ikazuchi.Web.Areas.RtcSessions.Models
{
    public class InviteCreateForm
    {
        public uint Expires { get; set; } = 60;

        public Guid SessionId { get; set; }
    }
}