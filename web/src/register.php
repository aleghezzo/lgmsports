<?php
include("connect.php");

$received_username =  filter_var($_POST["username"],FILTER_SANITIZE_STRING);
$received_password  = filter_var($_POST["password"],FILTER_SANITIZE_STRING);

$received_nickname =  filter_var($_POST["nickname"],FILTER_SANITIZE_STRING);

switch ($_POST["gender"]){
	case "Female":
	{
		$received_genderId = 1;
		break;
	}
	case "Male":
	{
		$received_genderId = 2;
		break;
	}
}

$received_levelId = $_POST["skill"];


$user_query_exists = "SELECT * FROM user WHERE userName='".$received_username."'";
$user_query_exists_result = mysqli_query($link,$user_query_exists);
$user_query_exists_amount = mysqli_num_rows($user_query_exists_result);

$player_query_exists = "SELECT * FROM player WHERE nickName='".$received_nickname."'";
$player_query_exists_result = mysqli_query($link,$player_query_exists);
$player_query_exists_amount = mysqli_num_rows($player_query_exists_result);

echo "USers:".$user_query_exists_amount;
echo "Players:".$player_query_exists_amount;


if($user_query_exists_amount == 0){
	if($player_query_exists_amount == 0)
	{
			$player_query_create = "INSERT INTO player(nickName,genderId,levelId) VALUES('".$received_nickname."','".$received_genderId."','".$received_levelId."')";
				if(mysqli_query($link,$player_query_create)){
					$player_query_lastid = mysqli_insert_id($link);

					$user_query_create = "INSERT INTO user(userName,password,lastLogin,roleId,playerId) VALUES('".$received_username."',MD5('".$received_password."'),NOW(),'1','".$player_query_lastid."')";
							echo $user_query_create;
							if(mysqli_query($link,$user_query_create)){
							$user_query_lastid = mysqli_insert_id($link);
							session_start();
							$_SESSION['id'] = $user_query_lastid;
							$_SESSION['username'] = $received_username;
							$_SESSION['nickname'] = $received_received_nickname;
							header("location:../index.php");
							}
							else{
							echo "0:".mysqli_error($link);
							#header("location:../register.php");
							}
				}
	}
	else
	{
		$player_query_exists_row = mysqli_fetch_assoc($player_query_exists_result);

					$user_query_create = "INSERT INTO user(userName,password,lastLogin,roleId,playerId) VALUES('".$received_username."',MD5('".$received_password."'),NOW(),'1','".$player_query_exists_row['id']."')";
							
							if(mysqli_query($link,$user_query_create)){
							$user_query_lastid = mysqli_insert_id($link);
							session_start();
							$_SESSION['id'] = $user_query_lastid;
							$_SESSION['username'] = $received_username;
							$_SESSION['nickname'] = $received_received_nickname;
							header("location:../index.php");
							}
							else{
							echo "0:".mysqli_error($link);
							header("location:../register.php?error=3");
							}
	}
	}					
else{
	header("location:../register.php?error=3");
}
	

?>