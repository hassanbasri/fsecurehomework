var express = require('express');
var router = express.Router();

var products={};


var eventTypes={};

var dupEventId={};
var dupEventIdCounter=0;

var eventIdTemp=[];

//var for processing day of week and time of the day
var dayOfWeek={};

var daysEnglish=['Sunday','Monday', 'Tuesday','Wednesday','Thursday','Friday','Saturday'];
var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

var unzip = require('unzip');
var fs=require('fs');
var show=true;
var showOnMap=false;
var crashPerModel={};
var crashDates={};

var device_activity_time={};
var crash_date_created={};

var data={
  completed:false,
  eventCount:0,
  eventsPerProducts:products,
  eventsDayAndTime:dayOfWeek,
  crashesCountPerModels:crashPerModel,
  crash_date_created:crash_date_created
};

var product_devices={};

var lineReader = require('readline').createInterface({
  input: fs.createReadStream('data')
});

//while reading file
lineReader.on('line', function (line) {


  data.eventCount+=1;

  //console.log(data.eventCount);



  var event=JSON.parse(line);



    //console.log(new Date(event.time.create_timestamp), new Date(event.timestamp));

    if(device_activity_time[event.device.device_id] == undefined){
      if (event.timestamp !=undefined) {
        device_activity_time[event.device.device_id]={firstevent:"", firsteventtype:"", latestevent:"", latesteventtype:"",diff:0};
        // device_activity_time[event.device.device_id].firstevent=event.timestamp;
        // device_activity_time[event.device.device_id].firsteventtype=event.type;

        device_activity_time[event.device.device_id].firstevent=event.time.create_timestamp;
        device_activity_time[event.device.device_id].firsteventtype=event.type;


      }

    }
    else {
      if(event.timestamp !=undefined)
      // device_activity_time[event.device.device_id].latestevent=event.timestamp;
      // device_activity_time[event.device.device_id].latesteventtype=event.type;
      // device_activity_time[event.device.device_id].diff=event.timestamp - device_activity_time[event.device.device_id].firstevent;

      device_activity_time[event.device.device_id].latestevent=event.time.create_timestamp;
      device_activity_time[event.device.device_id].latesteventtype=event.type;
      device_activity_time[event.device.device_id].diff=event.time.create_timestamp - device_activity_time[event.device.device_id].firstevent;


    }







  //  console.log(device_activity_time);
  //  console.log("******************************");

    if(event.type == "crash"){

      if(event.time.create_timestamp!=undefined){
      var crashDate=new Date(event.time.create_timestamp);

      var dateString=monthNames[crashDate.getMonth()]+"/"+crashDate.getDate()+"/"+crashDate.getFullYear();
      if(crash_date_created[dateString] ==  undefined){
        crash_date_created[dateString]=1;

      }else {
        crash_date_created[dateString]+=1;
      }

    }


      if(crashPerModel[event.device.model] ==  undefined)
        crashPerModel[event.device.model]=1;
        else {
          crashPerModel[event.device.model]+=1;
        }




    }



    //processor maintaince schedule
    //count events per day of the week
    if (event.timestamp!=undefined) {
      var date=new Date(event.timestamp);

      if(dayOfWeek[daysEnglish[date.getDay()]]== undefined){
        dayOfWeek[daysEnglish[date.getDay()]]={events:1, hours:{}};
        if(dayOfWeek[daysEnglish[date.getDay()]].hours[date.getHours()] == undefined){
          dayOfWeek[daysEnglish[date.getDay()]].hours[date.getHours()]=1;
        }

      }
      else {
        dayOfWeek[daysEnglish[date.getDay()]].events+=1;
        if(dayOfWeek[daysEnglish[date.getDay()]].hours[date.getHours()] == undefined){
          dayOfWeek[daysEnglish[date.getDay()]].hours[date.getHours()]=1;
        }else {
          dayOfWeek[daysEnglish[date.getDay()]].hours[date.getHours()]+=1;
        }
      }

    }

  //  console.log(dayOfWeek);




  //events generated per product count
    if(products[event.source] ==  undefined){
      products[event.source]={events:1,type:{},undefined_timestamps:0, first_time_launch:0,locations:[]};

      //set the first occurence  the type of events
      products[event.source].type[event.type]=1;

      //count the undefined timestamps
      if(event.timestamp ==  undefined){
          products[event.source].undefined_timestamps+=1;
        }

      //add location of the current event
      if(showOnMap && event.sender_info.geo != undefined &&  event.sender_info.geo.ll!=undefined)
      products[event.source].locations.push(event.sender_info.geo.ll);

    }
    else {
    //incrment the events for this product
    products[event.source].events+=1;

    //update the type of event and if a new event found add it to the types of event for
    //this product
    if(products[event.source].type[event.type] ==  undefined)
      products[event.source].type[event.type]=1;
    else
      products[event.source].type[event.type]+=1;

      //timestamp validation
      if(event.timestamp ==  undefined){
          products[event.source].undefined_timestamps+=1;

        }

        //add location of the current event
        if(showOnMap && event.sender_info.geo != undefined &&  event.sender_info.geo.ll!=undefined)
        products[event.source].locations.push(event.sender_info.geo.ll);


    }

    //check if the type is launch
    if(event.type == 'launch' ){

      // now create a datastructure that keep tracks of devices that are unique in each
      //product type so the number of uniuqe devices with first event as launch is the first launch event for
      //that product on any device

      if(product_devices[event.source] == undefined){
        product_devices[event.source]={devices:{}};
        product_devices[event.source].devices[event.device.device_id]=1;
        products[event.source].first_time_launch=1;

      }else {
        if(product_devices[event.source].devices[event.device.device_id] ==  undefined){
        product_devices[event.source].devices[event.device.device_id]=1;
        products[event.source].first_time_launch+=1;
      }
      }


    }



//console.log(products);

//console.log("*");

});




lineReader.on('close',function() {
  console.log("********DONE********");


// device activity process the datastructure and sort the devices based on the diff
deviceActivityTemp=[];
for(device in device_activity_time ){
  if(!isNaN(device_activity_time[device].diff))
  deviceActivityTemp.push({device_id:device,diff:device_activity_time[device].diff});
}

deviceActivityTemp.sort(function(device1, device2){
  return device2.diff-device1.diff

});

for (var i = 0; i < 3; i++) {
  console.log(deviceActivityTemp[i],device_activity_time[deviceActivityTemp[i].device_id].firsteventtype,new Date(device_activity_time[deviceActivityTemp[i].device_id].firstevent),device_activity_time[deviceActivityTemp[i].device_id].latesteventtype,new Date(device_activity_time[deviceActivityTemp[0].device_id].latestevent));

}




  data.completed=true;
});




router.get('/streaming', function(req, res, next) {
  var tempData=data;
  if(!data.completed){
    for ( product in tempData.eventsPerProducts ){
      tempData.eventsPerProducts [product].locations=[];
    };
  }
  res.json(tempData);
});



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Application Processor' });
});

module.exports = router;
