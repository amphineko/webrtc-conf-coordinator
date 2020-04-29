using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;

namespace Ikazuchi.Web.Areas.RtcSessions.Models
{
    [Authorize]
    public class SessionInitForm
    {
        [Required] public string Description { get; set; }

        [Required] public string Title { get; set; }

        [Required] public SessionVisibility Visibility { get; set; }
    }
}