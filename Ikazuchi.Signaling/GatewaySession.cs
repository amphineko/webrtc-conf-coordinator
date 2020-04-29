using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using Ikazuchi.Data.Models.Rtc;

namespace Ikazuchi.Signaling
{
    public class GatewaySession
    {
        public IDictionary<Guid, string> Connections { get; set; }

        public GatewaySession()
        {
            Connections = new ConcurrentDictionary<Guid, string>();
        }
    }
}
