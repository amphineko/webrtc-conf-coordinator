jQuery(document).ready(() => {
    function onExpireChanged() {
        const hours = jQuery("#InviteExpireHour").val();
        const mins = jQuery("#InviteExpireMinute").val();

        jQuery("#ExpiresTotalMinute").val(hours * 60 + mins);
    }

    var initial = jQuery("#ExpiresTotalMinute").val();

    jQuery("#InviteExpireHour").val(Math.floor(initial / 60));
    jQuery("#InviteExpireMinute").val(initial % 60);

    jQuery("#InviteExpireHour").change(() => onExpireChanged());
    jQuery("#InviteExpireMinute").change(() => onExpireChanged());
})