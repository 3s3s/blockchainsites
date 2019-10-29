'use strict'

const $ = require('jquery');

$('#settingsSave').click(() => {

  //toggle toolsTab
  if($('#showtoolstab').is(':checked')) {
    $('#toolsTab').css('display', 'inline');
    $('#itemTools').css('display', 'inline');
    $('#toolsLink')[0].click();
  }
  else {
    $('#toolsTab').css('display', 'none');
    $('#itemTools').css('display', 'none');
    $('#browserLink')[0].click();
  }


});
