using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Ikazuchi.Data.Models.Users;

namespace Ikazuchi.Data.Models.Rtc
{
    public class RtcSessionInvite
    {
        [Column(TypeName = "oid")] [Key] public uint Id { get; set; }

        [ForeignKey("CreatorId")] [Required] public virtual ApplicationUser Creator { get; set; }

        [Required] public bool Disabled { get; set; }

        [Required] public DateTime Expires { get; set; }

        [ForeignKey("SessionId")] [Required] public virtual RtcSession Session { get; set; }
    }
}