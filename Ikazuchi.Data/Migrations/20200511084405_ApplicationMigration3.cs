using Microsoft.EntityFrameworkCore.Migrations;

namespace Ikazuchi.Data.Migrations
{
    public partial class ApplicationMigration3 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Deleted",
                table: "RtcSessions",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Deleted",
                table: "RtcSessions");
        }
    }
}
