/*************************************************
*
* GOOGLE MEET ATTENDANCE TRACKER
* Author: Nick Young
* Email: usaussie@gmail.com
*
*
* ASSUMPTIONS:
* The CSV filename format used by Google (as of October 9th) is: "YYYY-MM-DD HH-MM Name of Meeting.csv"
* If the name format changes, the script may generate unexpected data for some of the derived columns (meeting name and date)
*
* INSTRUCTIONS: 
* (1) Update the variables below to point to your google sheet
* (2) Run the set_sheet_headers() function once, which will prompt for permissions and set the sheet column headers
* (3) Accept the permissions (asking for access for your script to read/write to google drive etc)
* (4) Run the process_all_pending_csv_files() function (once, or set a trigger)
* (5) Look in your google sheet as the function is running, and you should see results being inserted
*
* RECOMMENDATION:
* If you run this using a triggered schedule, then all you need to do, is move any CSVs into your pending folder, and they'll automatically get aggregated.
* This is then easy to add as a source to a Data Studio Dashboard. And...if you use the email/row permissions, people would only see their attendance and no one elses :-)
*
*
* UPDATE THESE VARIABLES
*
*************************************************/
// google sheet to store aggregate CSV info
var SHEET_URL = "replace_with_full_line_to_spreadsheet";
var SHEET_TAB_NAME = "Sheet1";

// folder ID for where to look for CSV files to process
// IE: the last part of the folder URL, like: https://drive.google.com/drive/u/0/folders/1fzw_Vx8uoidshda_B6SOFjEI_Co
var PENDING_CSV_DRIVE_FOLDER_ID = "replace_with_source_folder_code";

// trash files after processing, or just move to another drive
var TRASH_FILES_AFTER_MOVE = false; // false|true
// if TRASH_FILES_AFTER_MOVE  is false, then put them into this folder ID
var PROCESSED_CSV_DRIVE_FOLDER_ID = "replace_with_source_folder_code";

/*************************************************
*
* DO NOT CHANGE ANYTHING BELOW THIS LINE
*
*************************************************/

/*
*
* ONLY RUN THIS ONCE TO SET THE HEADER ROWS FOR THE GOOGLE SHEETS
*/
function set_sheet_headers() {
  
  var sheet = SpreadsheetApp.openByUrl(SHEET_URL).getSheetByName(SHEET_TAB_NAME);
  sheet.appendRow(["Code","Date","Email","Time Joined","Time Exited", "Duration (nb. Breakouts not counted)"]);
  
}

function process_all_pending_csv_files(){
  var ss = SpreadsheetApp.openByUrl(SHEET_URL).getSheetByName(SHEET_TAB_NAME);
  var folder = DriveApp.getFolderById(PENDING_CSV_DRIVE_FOLDER_ID);
  var list = [];
  var files = folder.getFiles();
  
  while (files.hasNext()){
    var file = files.next();
    //import the CSV data into the sheet
    importCSVbyFileId(file.getId());

    // comment the next section out if you're testing and want to leave the files in place
    if(TRASH_FILES_AFTER_MOVE) {
      // trash the file
      file.setTrashed(true);

    } else {
      // move the processed CSV file to the "Processed" folder
      var newFolder = DriveApp.getFolderById(PROCESSED_CSV_DRIVE_FOLDER_ID);
      file.moveTo(newFolder); // uses the new method that supports Shared Drives as well as regular Google Drive.
    }
    
  } 

}

function importCSVbyFileId(file_id) {

  var ss = SpreadsheetApp.openByUrl(SHEET_URL).getSheetByName(SHEET_TAB_NAME);
  var file = DriveApp.getFileById(file_id);
  
  var csvData = Utilities.parseCsv(file.getBlob().getDataAsString());

  // loop through the CSV rows skipping the first row headers
  for (var i = 1; i < csvData.length; i++) {
   
    // build the row
    var AFTER_FIRST_SPACE = file.getName().substr(file.getName().indexOf(' ')+1);
    var MEETING_NAME = AFTER_FIRST_SPACE.substr(AFTER_FIRST_SPACE.indexOf(' ')+1).replace(" - Attendance Report.csv", "");
    var MEETING_DATE = file.getName().substring(0, 10);

    // explode the time column value so we can tell if it's a string of hours, mins, or secs (or combination)
    var TIME_ARRAY = csvData[i][2].split(' '); // split string on comma space

    if(TIME_ARRAY.length == 4) {
      var DURATION_MINS = parseInt(TIME_ARRAY[0]) * 60 + parseInt(TIME_ARRAY[2]);
    }

    if(TIME_ARRAY.length == 2) {
      var DURATION_MINS = parseInt(TIME_ARRAY[0]);
    } 
    
    // append the data to the sheet
    ss.appendRow([MEETING_NAME, MEETING_DATE, csvData[i][1], csvData[i][3], csvData[i][4], DURATION_MINS]);
  }
  
}
