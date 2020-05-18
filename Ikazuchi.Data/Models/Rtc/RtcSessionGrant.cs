using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Ikazuchi.Data.Models.Users;

namespace Ikazuchi.Data.Models.Rtc
{
    public class RtcSessionGrant
    {
        [Key] public int Id { get; set; }

        [Required] public DateTime CreationTime { get; set; }

        [ForeignKey("SessionId")] [Required] public virtual RtcSession Session { get; set; }

        [Required] public Guid SessionId { get; set; }

        [ForeignKey("UserId")] [Required] public virtual ApplicationUser User { get; set; }

        [Required] public Guid UserId { get; set; }
    }
}