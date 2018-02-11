function getThisGame(){
    var gameId = location.hash.substr(1);
	getGame(gameId);
}

function getGame($value){
    $.ajax({
          url: "/src/api/gameHandler.php", 
          type: "GET",
          data: {
        	  "action" : "retrieve",
        	  "id": $value
          },
          dataType: "html",
          async: false,
          success: function(result){
        	  console.log(result);
        	  var $result = JSON.parse(result);

        	  $(document).ready(function(){
        	  	  drawEvent($result);
        		  drawTeams($result);
            	  drawTeamless($result);
        	  })
          },
          error: function(status,exception) {
        	  console.log(status);
        	  console.log(exception);
            }
      });
}

function getGameById($id) {
	$result = $.ajax({
          url: "/src/api/gameHandler.php", 
          type: "GET",
          data: {
        	  "action" : "retrieve",
        	  "id": $id
          },
          dataType: "html",
          async: false,
          success: function(result){
        	  console.log(result);
        	  $(document).ready(function(){
        	  	  
        	  })
          },
          error: function(status,exception) {
        	  console.log(status);
        	  console.log(exception);
            }
      });
	return JSON.parse($result.responseText);
}

function drawEvent($event) {
    $user = getUser();

    switch ($event.typeId) {
        default:
            var $eventType = "Something went wrong ;(";
            break;
        case "1":
            $eventType = "Football 5 vs 5 - (One field)";

            break;
        case "2":
            $eventType = "Football 5 vs 5 - (Two fields)";

            break;
        case "3":
            $eventType = "Tennis 1 vs 1";

            break;
        case "4":
            $eventType = "Tennis 2 vs 2";

            break;
    }



    if($user.roleId == '2'){
    	$buttons = "<a class='btn btn-primary btn-md' href='index.html'>Back</a>" +
			"<button class='btn btn-primary btn-md' onclick='addSelfPlayer("+$event.id+")'>Join Event</button>" +
			"<button class='btn btn-primary btn-md' onclick=''>Mark as finished</button>" +
			"<button class='btn btn-primary btn-md' onclick=''>Delete</button>";
	} else {
        $buttons = "<a class='btn btn-primary btn-md' href='index.html'>Back</a>" +
			"<button class='btn btn-primary btn-md' onclick='addSelfPlayer("+$event.id+")'>Join Event</button>";
	}

    $("#event-title").html($eventType);
    $("#event-date").html($event.date);
    $("#game-buttons").append($buttons);

}

// TODO Remove DrawTeamless -> Use DrawPlayer();
function drawTeamless(event) {

    $user = getUser();
    teamless = event.teamless;
	for(i = 0; i < teamless.length; i++) {
		
	switch(teamless[i].levelId){
	case "1":
		$level = "I know how to play";
		break;
	case "2":
		$level = "I'm ok";
		break;
	case "3":
		$level = "I know what a ball is.";
		break;
	case "4":
		$level = "I suck.";
		break;
	}
	
	switch(teamless[i].genderId){
	case "1":
		$gender = "Female";
		break;
	case "2":
		$gender = "Male";
		break;
	}


	if($user.roleId === "2") { // ADMIN
        $lowerButtons = "<button class='btn btn-primary btn-sm' onclick='removePlayer("+teamless[i].id+")' >Remove</button>";
        switch(event.typeId){
			case "default":
				$sideButtons = "<p>Error here amio ;)</p>";
        	case "1":
			case "2":
            $sideButtons =  "<button onclick='transferPlayer("+teamless[i].id+",1,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >1</button><br>"+
                "<button onclick='transferPlayer("+teamless[i].id+",2,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >2</button><br>" +
                "<button onclick='transferPlayer("+teamless[i].id+",3,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >3</button><br>" +
                "<button onclick='transferPlayer("+teamless[i].id+",4,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >4</button>";
				break;
			case "3":
                $sideButtons =  "<button onclick='transferPlayer("+teamless[i].id+",1,"+location.hash.substr(1)+")'  class='btn btn-primary btn-sm' >1</button><br>"+
                    "<button onclick='transferPlayer("+teamless[i].id+",2,"+location.hash.substr(1)+")'class='btn btn-primary btn-sm' >2</button><br>";
				break;
			case "4":
                $sideButtons =  "<button onclick='transferPlayer('"+teamless[i].id+",1,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm'>1</button><br>"+
                    "<button onclick="+teamless[i].id+",2,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >2</button><br>";

                break;
			case "5":
                $sideButtons =  "<button onclick='transferPlayer("+teamless[i].id+",1,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm'>1</button><br>"+
                    "<button onclick="+teamless[i].id+",2,"+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >2</button><br>";
				break;
        }

	} else if(teamless[i].id === $user.playerId) { // OWN PLAYER
        $lowerButtons = "<button class='btn btn-primary btn-sm' onclick='removePlayer("+teamless[i].id+")' >Remove</button>";
        $sideButtons = "";
	} else {
		$lowerButtons = "";
        $sideButtons = "";
	}

	var player = "<div id='player"+teamless[i].id+"' class='col-sm-3'>" +
					 "<div class='business-card'>" +
					 		"<div class='media'>" +
						 		"<div class='media-left'>" +
						 		"<img class='media-object rounded-circle profile-img' src='http://s3.amazonaws.com/37assets/svn/765-default-avatar.png'><br>" +
        						"<center>"+$lowerButtons+"</center>" +
						 		"</div>" +
						 		"<div class='media-body'>" +
							 		"<h4 class='card-title'>"+teamless[i].nickName+"</h4>" +
							 		"<small><p class='card-text'>"+$level+"</p></small>" +
							 		"<p class='card-text'>"+$gender+"</p>" +
						 		"</div>" +
						 		"<div class='media-menu-lower'>" +
									$sideButtons+
						 		"</div>" +
							"</div>" +
					"</div>" +
				"</div>";

	$("#teamless").append(player);
	}
}


function drawTeams(event) {

	teams = event.teams;
	console.log(teams);
    /* USER Buttons Chunk
    * It's purpose it's to set the appropriate buttons depending on logged in user */
    $user = getUser()
 	var $buttons;
	for(i = 1; i < teams.length+1; i++) {

		var team = "<div class='col-3'>" +
				   "<ul id='team"+i+"' class='list-group-item'>" +
				   "</ul>" +
				   "</div>";
		
		$("#teams").append(team);
		var title = "<h6>Team "+i+"</h6>";
		$("#team"+i).append(title);
		
		for(j = 0; j < teams[i-1].players.length; j++) {

            if($user.roleId === "2") { // ADMIN
                $buttons = "<button style='float:right' onclick='transferPlayer("+teams[i-1].players[j].id+","+null+","+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >Unasign</button>";
            } else if(teams[i].players[j].id === $user.playerId) { // OWN PLAYER
                $buttons = "<button style='float:right' onclick='transferPlayer("+teams[i-1].players[j].id+","+null+","+location.hash.substr(1)+")' class='btn btn-primary btn-sm' >Unasign</button>";
            } else {
                $buttons = "";
            }

			var player = "<li class='list-group-item' id='player"+teams[i-1].players[j].id+"'>" +
							teams[i-1].players[j].nickName+$buttons+"" +
							"</li>";
			$("#team"+i).append(player);
		}
	}

}