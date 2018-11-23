import { Component, OnInit} from '@angular/core';
import { GameService } from '../../services/game.service'
import {MessageService} from 'primeng/api';
import {ConfirmationService} from 'primeng/api';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  providers: [MessageService,ConfirmationService]
})
export class GameComponent implements OnInit{

  map:string = 'USA';
  playersNum:number = 2;
  gameMode:number = 0;
  territories:any[];
  maps:any[];
  gameModes:any[];
  numberOptions:any[];
  gameStarted:boolean = false;
  game:any;
  gameID:string;
  joinID:string;
  displayJoin:boolean = false;
  displayTroops:boolean = false;
  newTroopsNum:number;
  troopsToTerritory:number;
  selectedTerritory:any=null;
  assignableTerritories:any=[];
  currentPlayer:any;
  currentAdjacents:any=[];
  currentTerritoryHover:any;
  attackerTerritories:any=[];
  attackableTerritories:any=[];
  attackingTerritory:any;
  attackeeTerritory:any;
  attackingTroopsNum:number=1;
  selectedPlayerTypes:any=[];
  playerTypes:any=[];
  constructor(private gameService:GameService,private messageService: MessageService,
              private confirmationService:ConfirmationService) { }

  ngOnInit() {
    this.maps = [
          {label:'🇺🇸 USA', value:'USA'},
          {label:'🇪🇬 Egypt', value:'Egypt'}
      ];
    this.gameModes = [
          {label:'Human vs Human', value:0},
          {label:'Human vs AI', value:1},
          {label:'AI vs AI', value:2}
      ];
    this.numberOptions = [
          {label:'2', value:2},
          {label:'3', value:3},
          {label:'4', value:4},
          {label:'5', value:5},
          {label:'6', value:6},

      ];
      this.playerTypes = [
        {label:'Select',value:null},
        {label:'Human', value: 0},
        {label:'Passive', value:1},
        {label:'Aggressive', value:2},
        {label:'Pacifist', value:3},
        {label:'Greedy', value:4},
        {label:'A*', value:5},
        {label:'A*-Real-Time', value:6},
        {label:'Minimax', value:7}
      ];
    this.game={'territories':[]}
  }


  startGame(){
    this.gameStarted = true;
    let newGame
    if(this.gameMode==1){
      this.selectedPlayerTypes.unshift(0);
       newGame = {"map":this.map,"gameMode":this.gameMode,"playersNum":this.playersNum,"playerTypes":this.selectedPlayerTypes}
    }
    else if (this.gameMode==0){
       newGame = {"map":this.map,"gameMode":this.gameMode,"playersNum":this.playersNum,"playerTypes":this.zeros(this.playersNum)}
    }
    else{
      newGame = {"map":this.map,"gameMode":this.gameMode,"playersNum":this.playersNum,"playerTypes":this.selectedPlayerTypes}

    }
    this.gameService.createGame(newGame)
    .subscribe(game=>{
      this.game = game
      console.log(game);
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.gameID = this.game.game_id;
      this.getAttackerTerritories(this.currentPlayer);
      setTimeout((this.getNewTroops()),100);
    });
  }

  resetGame(){
    this.confirmationService.confirm({
            message: 'Are you sure that you want to proceed?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
              this.gameStarted = false;
              this.gameService.resetGame({"gameID":this.gameID}).subscribe(n=>{
                this.attackerTerritories =[];
                this.attackableTerritories =[];
                this.game.territories = [];
                this.selectedPlayerTypes=[];
                this.gameMode =0;
                this.attackingTerritory=null
                this.attackeeTerritory=null;
              });
            },
            reject: () => {
            }
        });
  }

  joinGame(){
    this.displayJoin = false;
    this.gameService.joinGame(this.joinID)
    .subscribe(game=>{
      if(game!=null){
      this.gameStarted = true;
      this.game = game
      console.log(game);
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.gameID = this.game.game_id;
      this.getAttackerTerritories(this.currentPlayer);
      this.messageService.add({severity:'success', summary: 'Join Successful', detail:"Enjoy the game!"});
    }
    else{
      this.messageService.add({severity:'error', summary: 'Error', detail:"Game doesn't exit.."});
    }
    });
  }

  getAttackerTerritories(player){
    if(!player)
    return
    this.attackerTerritories =[]
    for(let tr of player.territories){
      this.attackerTerritories.push(tr.name);
    }
    this.attackableTerritories = [];
    setTimeout(()=>{
    for(let t of player.territories){
      for(let tr of t.adjacent_territories){
        if (this.attackableTerritories.indexOf(tr) ==-1 &&this.attackerTerritories.indexOf(tr)==-1){
          this.attackableTerritories.push(tr);
        }
      }
    }},200)
  }

  async onAttacking(territory){
    this.attackeeTerritory = null;
     for(let t of this.currentPlayer.territories){
      if(territory == t.name){
        this.currentAdjacents = t.adjacent_territories;
        this.attackingTerritory=t;
      }
    }
    this.attackableTerritories = [];
   for(let t of this.attackingTerritory.adjacent_territories){
      if(this.attackerTerritories.indexOf(t)==-1){
        this.attackableTerritories.push(t);
      }
  }
}

  onAttackee(territory){
    for(let t of this.game.territories){
      if(territory == t.name){
        this.attackeeTerritory=t;
      }
    }
  }
  onPass(){
    this.gameService.passTurn(this.currentPlayer.id,{"gameID":this.gameID})
    .then(game=>{
      this.game = game;
      console.log(game);
      this.currentPlayer = this.game.players[this.game.player_turn];
      if(this.currentPlayer)
      this.getAttackerTerritories(this.currentPlayer);
      this.messageService.add({severity:'info', summary: 'Turn Ended', detail:"You've ended your turn"});
    })
    .then(async ()=>{
      if(this.gameMode==1){
        for(let i=0;i<this.playersNum;i++){
          if(this.currentPlayer&&this.currentPlayer.type==0){
          await  this.getNewTroops();
          }
          else if(this.currentPlayer&&this.currentPlayer.type!=0){
            await this.attackAI();
          }
        }
    }
    else{
      if(this.currentPlayer)
      this.getNewTroops();
    }
  });
    setTimeout(()=>this.attackeeTerritory=null,100);
    setTimeout(()=>this.attackingTerritory=null,100);
  }

  onAttack(){
    let attack ={
      "attackerID":this.currentPlayer.id,
      "attackeeID":this.attackeeTerritory.occupying_player,
      "attackerTerritory":this.attackingTerritory.name,
      "attackeeTerritory":this.attackeeTerritory.name,
      "troopsNum":this.attackingTroopsNum,
      "gameID":this.gameID,
    }
    this.gameService.attack(attack)
    .then(game=>{
      this.game = game;
      console.log(game);
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.getAttackerTerritories(this.currentPlayer);
      if(this.game.attack.status==true){
      this.messageService.add({severity:'success', summary: 'Attack successful', detail:this.game.attack.msg});
    }
      if(this.game.attack.status==false)
      this.messageService.add({severity:'error', summary: 'Attack failed', detail:this.game.attack.msg});
    });
    setTimeout(()=>this.attackeeTerritory=null,50);
    setTimeout(()=>this.attackingTerritory=null,50);
    setTimeout(()=>this.attackingTroopsNum=1,50);
  }

  async attackAI(){
    if(this.currentPlayer.type==1){
      await this.attackPassive();
    }
    else if(this.currentPlayer.type==2){
      await this.attackAggressive();
    }
    else if(this.currentPlayer.type==3){
      await this.attackPacifist();
    }
  }

  async attackPassive(){
    console.log(this.currentPlayer.id);
    await this.gameService.attackPassive(this.currentPlayer.id,{"gameID":this.gameID})
    .then(game=>{
      this.game = game;
      console.log(game);
      if(this.game.attack.status==true){
        this.messageService.add({severity:'success', summary: "Congrats you played yourself", detail:"Passive AI "+ this.currentPlayer.id+" has "+this.game.attack.msg});
    }
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.getAttackerTerritories(this.currentPlayer);

    });
  }

  async attackAggressive(){
    console.log(this.currentPlayer.id);
    await this.gameService.attackAggressive(this.currentPlayer.id,{"gameID":this.gameID})
    .then(async game=>{
      this.game = game;
      console.log(game);
      this.messageService.add({severity:'success', summary: "AI Bonus Troops", detail:"Agressive AI "+ this.currentPlayer.id+" has "+this.game.troops_msg});
      if(this.game.attacks.length==0){
        await this.messageService.add({severity:'error', summary: "AI failed", detail:"Agressive AI "+ this.currentPlayer.id+" couldn't make an attack"});
      }
    for(let attack of this.game.attacks){
      if(attack.length==0){
        await this.messageService.add({severity:'error', summary: "AI failed", detail:"Agressive AI "+ this.currentPlayer.id+" couldn't make an attack"});
      }
      if(attack.status==true){
        await this.messageService.add({severity:'success', summary: "Congrats you played yourself", detail:"Agressive AI "+ this.currentPlayer.id+" has "+attack.ai_msg});
      }
      if(attack.status==false){
        await this.messageService.add({severity:'error', summary: "AI failed", detail:"Agressive AI "+ this.currentPlayer.id+" has made his attack and failed \n"+attack.msg});
      }
    }
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.getAttackerTerritories(this.currentPlayer);

    });
  }

  async attackPacifist(){
    console.log(this.currentPlayer.id);
    await this.gameService.attackPacifist(this.currentPlayer.id,{"gameID":this.gameID})
    .then(game=>{
      this.game = game;
      console.log(game);
      if(this.game.attack.status==true){
        this.messageService.add({severity:'success', summary: "Congrats you played yourself", detail:"Pacifist AI "+ this.currentPlayer.id+" has "+this.game.attack.ai_msg});
    }
    if(this.game.attack.status==false){
      this.messageService.add({severity:'error', summary: "AI failed", detail:"Pacifist AI "+ this.currentPlayer.id+" has made his attack and failed \n"+this.game.attack.msg});

    }
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.getAttackerTerritories(this.currentPlayer);

    });
  }

  getNewTroops(){
    this.getAssignableTerritories();
    this.gameService.getNewTroopsNum(this.gameID)
    .subscribe(res=>{
      this.newTroopsNum = res['troops_num'];
      this.displayTroops = true;
    });
  }

  assignTroops(){
    if(this.selectedTerritory!=null){
    let assign = {};
    assign[this.selectedTerritory]=this.troopsToTerritory;
    let post = {"gameID":this.gameID,"troops":assign};
    this.gameService.assignNewTroops(this.currentPlayer.id,post)
    .subscribe(game=>{
      this.newTroopsNum-=this.troopsToTerritory;
      if(this.newTroopsNum==0){
        this.displayTroops = false;
      }
      this.game = game;
      console.log(game);
      this.currentPlayer = this.game.players[this.game.player_turn];
      this.getAttackerTerritories(this.currentPlayer);
      this.messageService.add({severity:'success', summary: 'At your service', detail:this.troopsToTerritory+' assigned to '+this.selectedTerritory});
      setTimeout(()=>{this.troopsToTerritory=0},20)
      setTimeout(()=>{this.selectedTerritory=null},20)

    });
  }
  else{
    this.messageService.add({severity:'error', summary: 'Error', detail:'Select a territory first!'});
  }
  }

  getAssignableTerritories(){
    this.assignableTerritories = [];
    for(let t of this.game.territories){
      if(t.occupying_player!=null&&t.occupying_player==this.currentPlayer.id){
         this.assignableTerritories.push({label:t.name, value:t.name});
      }
      else if(t.occupying_player==null){
        this.assignableTerritories.push({label:t.name, value:t.name});
      }
    }
  }
   range(size) {
    let arr =[]
    for(let i=0;i<size;i++){
      arr[i]=i;
    }
    return arr;
  }

  zeros(size){
    let arr =[]
    for(let i=0;i<size;i++){
      arr[i]=0;
    }
    return arr;
  }

  onModeChange(){
  this.selectedPlayerTypes = [];
  }

  onTerritoryChange(territory){
    this.currentTerritoryHover = territory;
  }

  getColor(territory){
    return territory.occupying_player!=null? this.game.players[territory.occupying_player].color:''
  }

}
